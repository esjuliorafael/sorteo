import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs"; // added for migration logic
import crypto from "crypto";
import { rateLimit } from "express-rate-limit";
import { validateMPSignature } from "./src/lib/mp-signature.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Migration logic: KOUUN → Sorteo
const OLD_DB_PATH = "kouun.db";
const NEW_DB_PATH = "sorteo.db";

if (fs.existsSync(OLD_DB_PATH) && !fs.existsSync(NEW_DB_PATH)) {
  console.log(`Migrating database from ${OLD_DB_PATH} to ${NEW_DB_PATH}...`);
  fs.copyFileSync(OLD_DB_PATH, NEW_DB_PATH);
}

const db = new Database(NEW_DB_PATH); // renamed: KOUUN → Sorteo
const JWT_SECRET = process.env.JWT_SECRET || "sorteo-secret-key"; // renamed: KOUUN → Sorteo

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    business_name TEXT,
    business_slug TEXT UNIQUE,
    plan TEXT DEFAULT 'trial',
    subscription_end DATETIME,
    bank_name TEXT,
    bank_clabe TEXT,
    bank_account_holder TEXT,
    bank_alias TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS raffles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    short_id TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'simple' or 'opportunities'
    ticket_count INTEGER NOT NULL,
    opportunities_per_ticket INTEGER DEFAULT 1,
    distribution_type TEXT DEFAULT 'linear', -- 'linear' or 'random'
    ticket_price REAL NOT NULL,
    currency TEXT DEFAULT 'MXN',
    draw_date DATETIME NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'closed', 'archived'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raffle_id INTEGER NOT NULL,
    number TEXT NOT NULL,
    participant_name TEXT,
    participant_whatsapp TEXT,
    status TEXT DEFAULT 'available', -- 'available', 'reserved', 'paid'
    reserved_at DATETIME,
    paid_at DATETIME,
    FOREIGN KEY (raffle_id) REFERENCES raffles(id)
  );

  CREATE TABLE IF NOT EXISTS ticket_opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    number TEXT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS mp_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    mp_user_id TEXT NOT NULL,
    expires_at DATETIME,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'discount_percent', 'discount_fixed', 'free_plan', 'extend_days'
    value REAL NOT NULL,
    applicable_plans TEXT DEFAULT 'all', -- 'all' or '3m,6m,annual'
    plan_granted TEXT,
    max_uses INTEGER DEFAULT NULL,
    used_count INTEGER DEFAULT 0,
    expires_at DATETIME DEFAULT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS promo_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    promo_code_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    plan_id TEXT NOT NULL,
    discount_applied REAL NOT NULL,
    status TEXT DEFAULT 'completed', -- 'completed' or 'pending'
    redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS mp_payment_refs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    preference_id TEXT NOT NULL,
    ticket_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS processed_mp_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id TEXT UNIQUE NOT NULL,
    ticket_id INTEGER,
    status TEXT NOT NULL,       -- 'approved' | 'rejected' | 'cancelled'
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// BUG FIX 2: Ensure payment_type_id exists
try {
  db.exec("ALTER TABLE processed_mp_payments ADD COLUMN payment_type_id TEXT;");
} catch (e) {
  // Column already exists or table doesn't exist yet
}

// Insert test promo codes
const testCodes = [
  { code: 'SORTEO2026', type: 'discount_percent', value: 30, applicable_plans: 'all', description: '30% OFF en cualquier plan' },
  { code: 'BETA1MES', type: 'free_plan', value: 0, plan_granted: '3m', max_uses: 50, applicable_plans: '3m', description: 'Beta tester: 3 meses gratis' },
  { code: 'LAUNCH50', type: 'discount_fixed', value: 150, applicable_plans: 'annual', description: '$150 MXN OFF en plan anual' }
];

for (const pc of testCodes) {
  try {
    db.prepare(`
      INSERT INTO promo_codes (code, type, value, applicable_plans, plan_granted, max_uses, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(pc.code, pc.type, pc.value, pc.applicable_plans, pc.plan_granted || null, pc.max_uses || null, pc.description);
  } catch (e) {
    // Ignore if already exists
  }
}

// Migration: Add missing columns to users table if they don't exist
const migrateTable = (tableName: string, requiredColumns: { name: string, type: string }[]) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
  const columnNames = columns.map(c => c.name);

  for (const col of requiredColumns) {
    if (!columnNames.includes(col.name)) {
      console.log(`Adding missing column ${col.name} to ${tableName} table...`);
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}`);
    }
  }
};

migrateTable("users", [
  { name: "phone", type: "TEXT" },
  { name: "business_name", type: "TEXT" },
  { name: "business_slug", type: "TEXT UNIQUE" },
  { name: "bank_name", type: "TEXT" },
  { name: "bank_clabe", type: "TEXT" },
  { name: "bank_account_holder", type: "TEXT" },
  { name: "bank_alias", type: "TEXT" },
  { name: "mp_checkout_enabled", type: "INTEGER DEFAULT 0" }
]);

migrateTable("raffles", [
  { name: "short_id", type: "TEXT UNIQUE" },
  { name: "opportunities_per_ticket", type: "INTEGER DEFAULT 1" },
  { name: "distribution_type", type: "TEXT DEFAULT 'linear'" },
  { name: "currency", type: "TEXT DEFAULT 'MXN'" }
]);

migrateTable("tickets", [
  { name: "participant_whatsapp", type: "TEXT" },
  { name: "locked_at", type: "DATETIME" },
  { name: "mp_payment_id", type: "TEXT" }
]);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);

  app.use(cors());
  app.use(express.json());

  const isDev = process.env.NODE_ENV !== 'production';

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 100 : 10,
    message: { error: "Demasiados intentos. Por favor espera 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, forwardedHeader: false },
  });

  const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDev ? 30 : 3,
    message: { error: "Demasiadas solicitudes de recuperación. Intenta en una hora." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, forwardedHeader: false },
  });

  const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 300 : 30,
    message: { error: "Límite de renovación de sesión alcanzado." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, forwardedHeader: false },
  });

  const paymentStatusLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: { error: "Demasiadas consultas de estado de pago." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, forwardedHeader: false },
  });

  // Helper: Generate Short ID
  const generateShortId = (length = 6) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const getUniqueShortId = () => {
    let shortId = generateShortId();
    while (db.prepare("SELECT id FROM raffles WHERE short_id = ?").get(shortId)) {
      shortId = generateShortId();
    }
    return shortId;
  };

  // Mercado Pago Config
  const MP_CLIENT_ID = process.env.MP_CLIENT_ID;
  const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET;
  const MP_MARKETPLACE_FEE_PERCENT = parseFloat(process.env.MP_MARKETPLACE_FEE_PERCENT || "3");
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

  // Config Check
  let KEY: string;
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    if (isDev) {
      console.warn('[Config] ENCRYPTION_KEY no configurada o inválida. Usando clave de desarrollo temporal.');
      KEY = "development_key_32_chars_exactly_"; // 32 chars
    } else {
      throw new Error(
        '[Config] ENCRYPTION_KEY es requerida y debe tener exactamente ' +
        '32 caracteres en producción. Genera una con: node -e "console.log(require(\'crypto\')' +
        '.randomBytes(16).toString(\'hex\'))"'
      );
    }
  } else {
    KEY = ENCRYPTION_KEY;
  }

  if (!process.env.JWT_SECRET) {
    console.warn('[Config] JWT_SECRET no definido — usando valor por defecto inseguro.');
  }
  if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) {
    console.warn('[Config] MP_CLIENT_ID / MP_CLIENT_SECRET no definidos — ' +
      'la conexión con Mercado Pago estará deshabilitada.');
  }
  if (!process.env.MP_ACCESS_TOKEN) {
    console.warn('[Config] MP_ACCESS_TOKEN no definido — ' +
      'el webhook no podrá procesar pagos.');
  }

  // Encryption Helpers
  const encrypt = (text: string) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  };

  const decrypt = (text: string) => {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  };

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Auth Routes
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)");
      const info = stmt.run(email, hashedPassword, name);
      res.status(201).json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(400).json({ error: "User already exists" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    db.prepare("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)").run(user.id, refreshToken, expiresAt.toISOString());

    res.json({ 
      token, 
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan } 
    });
  });

  app.post("/api/auth/refresh", refreshLimiter, (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });

    const storedToken = db.prepare("SELECT * FROM refresh_tokens WHERE token = ?").get(refreshToken) as any;
    if (!storedToken) return res.status(401).json({ error: "Invalid refresh token" });

    if (new Date(storedToken.expires_at) < new Date()) {
      db.prepare("DELETE FROM refresh_tokens WHERE token = ?").run(refreshToken);
      return res.status(401).json({ error: "Refresh token expired" });
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(storedToken.user_id) as any;
    if (!user) return res.status(401).json({ error: "User not found" });

    const newToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ token: newToken });
  });

  app.post("/api/auth/logout", (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
      db.prepare("DELETE FROM refresh_tokens WHERE token = ?").run(refreshToken);
    }
    res.json({ success: true });
  });

  app.post("/api/auth/forgot-password", forgotPasswordLimiter, (req, res) => {
    const { email } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;

    // Always return success message for security
    const response = { message: "Si el email existe, recibirás instrucciones para restablecer tu contraseña." };

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

      db.prepare("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)").run(user.id, token, expiresAt.toISOString());

      // TODO: Integrar nodemailer/Resend para enviar el email real.
      // Por ahora, devolvemos el token en la respuesta para el MVP.
      return res.json({ ...response, token });
    }

    res.json(response);
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Token and password required" });

    const resetRequest = db.prepare("SELECT * FROM password_resets WHERE token = ? AND used = 0").get(token) as any;
    if (!resetRequest) return res.status(400).json({ error: "Token inválido o ya utilizado" });

    if (new Date(resetRequest.expires_at) < new Date()) {
      return res.status(400).json({ error: "Token expirado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, resetRequest.user_id);
    db.prepare("UPDATE password_resets SET used = 1 WHERE id = ?").run(resetRequest.id);

    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  });

  app.get("/api/user/profile", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT id, email, name, phone, plan, subscription_end, bank_name, bank_clabe, bank_account_holder, bank_alias, business_name, business_slug, mp_checkout_enabled FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
  });

  app.put("/api/user/profile", authenticateToken, (req: any, res) => {
    const { name, phone, business_name, business_slug, mp_checkout_enabled } = req.body;
    
    // Simple slug validation
    if (business_slug && !/^[a-z0-9-]+$/.test(business_slug)) {
      return res.status(400).json({ error: "El slug solo puede contener letras minúsculas, números y guiones" });
    }

    try {
      const stmt = db.prepare("UPDATE users SET name = ?, phone = ?, business_name = ?, business_slug = ?, mp_checkout_enabled = ? WHERE id = ?");
      stmt.run(name, phone, business_name, business_slug, mp_checkout_enabled ? 1 : 0, req.user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "El slug ya está en uso" });
    }
  });

  app.put("/api/user/bank-info", authenticateToken, (req: any, res) => {
    const { bank_name, bank_clabe, bank_account_holder, bank_alias } = req.body;
    
    // Simple CLABE validation: 18 digits
    if (bank_clabe && !/^\d{18}$/.test(bank_clabe)) {
      return res.status(400).json({ error: "La CLABE debe tener exactamente 18 dígitos numéricos" });
    }

    const stmt = db.prepare("UPDATE users SET bank_name = ?, bank_clabe = ?, bank_account_holder = ?, bank_alias = ? WHERE id = ?");
    stmt.run(bank_name, bank_clabe, bank_account_holder, bank_alias, req.user.id);
    res.json({ success: true });
  });

  // Raffle Routes
  app.get("/api/raffles", authenticateToken, (req: any, res) => {
    const raffles = db.prepare("SELECT * FROM raffles WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    res.json(raffles);
  });

  app.post("/api/raffles", authenticateToken, (req: any, res) => {
    const { title, description, type, ticket_count, opportunities_per_ticket, distribution_type, ticket_price, currency, draw_date } = req.body;
    
    // Check plan limits
    const user = db.prepare("SELECT plan FROM users WHERE id = ?").get(req.user.id) as any;
    if (user.plan === 'trial') {
      const activeRaffles = db.prepare("SELECT COUNT(*) as count FROM raffles WHERE user_id = ?").get(req.user.id) as any;
      if (activeRaffles.count >= 1) {
        return res.status(403).json({ error: "Trial plan limited to 1 raffle" });
      }
    }

    const shortId = getUniqueShortId();

    const stmt = db.prepare(`
      INSERT INTO raffles (user_id, short_id, title, description, type, ticket_count, opportunities_per_ticket, distribution_type, ticket_price, currency, draw_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(req.user.id, shortId, title, description, type, ticket_count, opportunities_per_ticket, distribution_type, ticket_price, currency, draw_date);
    const raffleId = info.lastInsertRowid;

    // Generate tickets
    const insertTicket = db.prepare("INSERT INTO tickets (raffle_id, number) VALUES (?, ?)");
    const insertOpportunity = db.prepare("INSERT INTO ticket_opportunities (ticket_id, number) VALUES (?, ?)");

    const isPowerOf10 = (n: number) => Math.log10(n) % 1 === 0;
    const padSize = Math.max(2, String(ticket_count).length);

    db.transaction(() => {
      if (type === 'simple') {
        const start = isPowerOf10(ticket_count) ? 0 : 1;
        for (let i = 0; i < ticket_count; i++) {
          const num = String(start + i).padStart(padSize, '0');
          insertTicket.run(raffleId, num);
        }
      } else {
        // Opportunities logic
        const totalNumbers = ticket_count * opportunities_per_ticket;
        const numbers = Array.from({ length: totalNumbers }, (_, i) => {
          const start = isPowerOf10(totalNumbers) ? 0 : 1;
          return String(start + i).padStart(String(totalNumbers).length, '0');
        });

        if (distribution_type === 'random') {
          for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
          }
        }

        for (let i = 0; i < ticket_count; i++) {
          const ticketNum = String(i + 1).padStart(padSize, '0');
          const ticketInfo = insertTicket.run(raffleId, ticketNum);
          const ticketId = ticketInfo.lastInsertRowid;

          for (let j = 0; j < opportunities_per_ticket; j++) {
            const num = distribution_type === 'linear' 
              ? numbers[i + j * ticket_count]
              : numbers[i * opportunities_per_ticket + j];
            insertOpportunity.run(ticketId, num);
          }
        }
      }
    })();

    res.status(201).json({ id: raffleId });
  });

  app.get("/api/raffles/:id", authenticateToken, (req: any, res) => {
    const raffle = db.prepare("SELECT * FROM raffles WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
    if (!raffle) return res.sendStatus(404);
    
    const tickets = db.prepare(`
      SELECT t.*, GROUP_CONCAT(o.number) as opportunities
      FROM tickets t
      LEFT JOIN ticket_opportunities o ON t.id = o.ticket_id
      WHERE t.raffle_id = ?
      GROUP BY t.id
    `).all(req.params.id);
    
    res.json({ ...raffle, tickets });
  });

  app.post("/api/tickets/:id/reserve", authenticateToken, (req: any, res) => {
    const { name, whatsapp } = req.body;
    const stmt = db.prepare("UPDATE tickets SET participant_name = ?, participant_whatsapp = ?, status = 'reserved', reserved_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'available'");
    const info = stmt.run(name, whatsapp, req.params.id);
    
    if (info.changes === 0) return res.status(400).json({ error: "Ticket not available" });
    res.json({ success: true });
  });

  app.post("/api/tickets/:id/pay", authenticateToken, (req: any, res) => {
    const stmt = db.prepare("UPDATE tickets SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'reserved'");
    const info = stmt.run(req.params.id);
    
    if (info.changes === 0) return res.status(400).json({ error: "Ticket not reserved" });
    res.json({ success: true });
  });

  app.delete("/api/tickets/:id", authenticateToken, (req: any, res) => {
    const stmt = db.prepare("UPDATE tickets SET participant_name = NULL, participant_whatsapp = NULL, status = 'available', reserved_at = NULL, paid_at = NULL WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/dashboard/stats", authenticateToken, (req: any, res) => {
    const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT r.id) as total_raffles,
        SUM(CASE WHEN r.status = 'active' THEN 1 ELSE 0 END) as active_raffles,
        COUNT(t.id) as total_tickets,
        SUM(CASE WHEN t.status = 'paid' THEN 1 ELSE 0 END) as paid_tickets,
        SUM(CASE WHEN t.status = 'reserved' THEN 1 ELSE 0 END) as reserved_tickets,
        SUM(CASE WHEN t.status = 'available' THEN 1 ELSE 0 END) as available_tickets,
        COALESCE(SUM(CASE WHEN t.status = 'paid' THEN r.ticket_price ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN t.status = 'reserved' THEN r.ticket_price ELSE 0 END), 0) as pending_revenue
      FROM raffles r
      LEFT JOIN tickets t ON r.id = t.raffle_id
      WHERE r.user_id = ?
    `).get(req.user.id);
    res.json(stats);
  });

  app.get("/api/dashboard/sales-by-raffle", authenticateToken, (req: any, res) => {
    const sales = db.prepare(`
      SELECT 
        r.id as raffle_id, 
        r.title, 
        SUM(CASE WHEN t.status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN t.status = 'reserved' THEN 1 ELSE 0 END) as reserved_count,
        r.ticket_price
      FROM raffles r
      LEFT JOIN tickets t ON r.id = t.raffle_id
      WHERE r.user_id = ?
      GROUP BY r.id
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all(req.user.id);
    res.json(sales);
  });

  app.get("/api/dashboard/revenue-timeline", authenticateToken, (req: any, res) => {
    const timeline = db.prepare(`
      SELECT 
        date(t.paid_at) as date,
        SUM(r.ticket_price) as revenue
      FROM tickets t
      JOIN raffles r ON t.raffle_id = r.id
      WHERE r.user_id = ? AND t.status = 'paid' AND t.paid_at >= date('now', '-30 days')
      GROUP BY date(t.paid_at)
      ORDER BY date ASC
    `).all(req.user.id) as any[];

    // Fill in missing dates
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = timeline.find(t => t.date === dateStr);
      result.push({
        date: dateStr,
        revenue: entry ? entry.revenue : 0
      });
    }
    res.json(result);
  });

  app.get("/api/dashboard/recent-activity", authenticateToken, (req: any, res) => {
    const activity = db.prepare(`
      SELECT * FROM (
        SELECT 'reserved' as type, t.number as ticket_number, t.participant_name, r.title as raffle_title, t.reserved_at as timestamp 
        FROM tickets t 
        JOIN raffles r ON t.raffle_id = r.id 
        WHERE r.user_id = ? AND t.reserved_at IS NOT NULL
        
        UNION ALL
        
        SELECT 'paid' as type, t.number as ticket_number, t.participant_name, r.title as raffle_title, t.paid_at as timestamp 
        FROM tickets t 
        JOIN raffles r ON t.raffle_id = r.id 
        WHERE r.user_id = ? AND t.paid_at IS NOT NULL
        
        UNION ALL
        
        SELECT 'raffle_created' as type, NULL as ticket_number, NULL as participant_name, title as raffle_title, created_at as timestamp 
        FROM raffles 
        WHERE user_id = ?
      )
      ORDER BY timestamp DESC
      LIMIT 20
    `).all(req.user.id, req.user.id, req.user.id);
    res.json(activity);
  });

  app.get("/api/dashboard/upcoming-raffles", authenticateToken, (req: any, res) => {
    const upcoming = db.prepare(`
      SELECT 
        r.id, r.short_id, r.title, r.draw_date, r.ticket_count,
        COUNT(t.id) as sold_count
      FROM raffles r
      LEFT JOIN tickets t ON r.id = t.raffle_id AND t.status IN ('paid', 'reserved', 'processing')
      WHERE r.user_id = ? AND r.status = 'active' AND r.draw_date BETWEEN date('now') AND date('now', '+30 days')
      GROUP BY r.id
      ORDER BY r.draw_date ASC
      LIMIT 5
    `).all(req.user.id);
    res.json(upcoming);
  });

  // Mercado Pago Routes
  app.get("/api/mp/connect", authenticateToken, (req: any, res) => {
    if (!MP_CLIENT_ID) return res.status(500).json({ error: "Mercado Pago no está configurado" });
    
    const state = jwt.sign({ userId: req.user.id }, JWT_SECRET, { expiresIn: '10m' });
    const redirectUri = `${APP_URL}/api/mp/callback`;
    const authUrl = `https://auth.mercadopago.com.mx/authorization?client_id=${MP_CLIENT_ID}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
    res.json({ url: authUrl });
  });

  app.get("/api/mp/callback", async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send("Faltan parámetros");

    try {
      const decoded = jwt.verify(state as string, JWT_SECRET) as any;
      const userId = decoded.userId;

      const redirectUri = `${APP_URL}/api/mp/callback`;
      const response = await fetch("https://api.mercadopago.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: MP_CLIENT_ID,
          client_secret: MP_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.message || data.error);

      const accessTokenEnc = encrypt(data.access_token);
      const refreshTokenEnc = encrypt(data.refresh_token);
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

      db.prepare(`
        INSERT INTO mp_credentials (user_id, access_token_encrypted, refresh_token_encrypted, mp_user_id, expires_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          access_token_encrypted = excluded.access_token_encrypted,
          refresh_token_encrypted = excluded.refresh_token_encrypted,
          mp_user_id = excluded.mp_user_id,
          expires_at = excluded.expires_at,
          connected_at = CURRENT_TIMESTAMP
      `).run(userId, accessTokenEnc, refreshTokenEnc, data.user_id, expiresAt.toISOString());

      res.redirect("/settings?mp=connected");
    } catch (error: any) {
      console.error("MP Callback Error:", error);
      res.redirect("/settings?mp=error");
    }
  });

  app.get("/api/mp/status", authenticateToken, (req: any, res) => {
    const creds = db.prepare("SELECT mp_user_id FROM mp_credentials WHERE user_id = ?").get(req.user.id) as any;
    res.json({ connected: !!creds, mp_user_id: creds?.mp_user_id });
  });

  app.post("/api/mp/disconnect", authenticateToken, (req: any, res) => {
    db.prepare("DELETE FROM mp_credentials WHERE user_id = ?").run(req.user.id);
    res.json({ success: true });
  });

  // Promo Code Routes
  const PLAN_PRICES: Record<string, number> = {
    'trial': 0,
    '3m': 299,
    '6m': 499,
    'annual': 799
  };

  app.post("/api/promo/validate", authenticateToken, (req: any, res) => {
    const { code, plan_id } = req.body;
    if (!code || !plan_id) return res.status(400).json({ valid: false, error: "Código y plan requeridos" });

    const promo = db.prepare("SELECT * FROM promo_codes WHERE UPPER(code) = ? AND is_active = 1").get(code.toUpperCase()) as any;
    
    if (!promo) return res.json({ valid: false, error: "Código no encontrado" });

    // Expiration check
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return res.json({ valid: false, error: "Código expirado" });
    }

    // Max uses check
    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
      return res.json({ valid: false, error: "Código agotado" });
    }

    // Applicable plans check
    if (promo.applicable_plans !== 'all') {
      const allowed = promo.applicable_plans.split(',');
      if (!allowed.includes(plan_id)) {
        return res.json({ valid: false, error: "Este código no aplica para el plan seleccionado" });
      }
    }

    // User already redeemed check
    const alreadyRedeemed = db.prepare("SELECT id FROM promo_redemptions WHERE promo_code_id = ? AND user_id = ? AND status = 'completed'").get(promo.id, req.user.id);
    if (alreadyRedeemed) {
      return res.json({ valid: false, error: "Ya canjeaste este código" });
    }

    const originalPrice = PLAN_PRICES[plan_id] || 0;
    let discountAmount = 0;

    if (promo.type === 'discount_percent') {
      discountAmount = originalPrice * (promo.value / 100);
    } else if (promo.type === 'discount_fixed') {
      discountAmount = promo.value;
    } else if (promo.type === 'free_plan') {
      discountAmount = originalPrice;
    }

    const finalPrice = Math.max(0, originalPrice - discountAmount);

    res.json({
      valid: true,
      type: promo.type,
      original_price: Number(originalPrice.toFixed(2)),
      discount_amount: Number(discountAmount.toFixed(2)),
      final_price: Number(finalPrice.toFixed(2)),
      plan_granted: promo.plan_granted
    });
  });

  app.post("/api/promo/redeem", authenticateToken, (req: any, res) => {
    const { code, plan_id } = req.body;
    if (!code || !plan_id) return res.status(400).json({ success: false, error: "Código y plan requeridos" });

    const promo = db.prepare("SELECT * FROM promo_codes WHERE UPPER(code) = ? AND is_active = 1").get(code.toUpperCase()) as any;
    if (!promo) return res.status(400).json({ success: false, error: "Código no encontrado" });

    // Re-run validations
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) return res.status(400).json({ success: false, error: "Código expirado" });
    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) return res.status(400).json({ success: false, error: "Código agotado" });
    
    if (promo.applicable_plans !== 'all') {
      const allowed = promo.applicable_plans.split(',');
      if (!allowed.includes(plan_id)) return res.status(400).json({ success: false, error: "Plan no aplicable" });
    }

    const alreadyRedeemed = db.prepare("SELECT id FROM promo_redemptions WHERE promo_code_id = ? AND user_id = ? AND status = 'completed'").get(promo.id, req.user.id);
    if (alreadyRedeemed) return res.status(400).json({ success: false, error: "Ya canjeaste este código" });

    const originalPrice = PLAN_PRICES[plan_id] || 0;
    let discountAmount = 0;
    if (promo.type === 'discount_percent') discountAmount = originalPrice * (promo.value / 100);
    else if (promo.type === 'discount_fixed') discountAmount = promo.value;
    else if (promo.type === 'free_plan') discountAmount = originalPrice;

    try {
      db.transaction(() => {
        // Record redemption
        const status = promo.type === 'free_plan' ? 'completed' : 'pending';
        db.prepare("INSERT INTO promo_redemptions (promo_code_id, user_id, plan_id, discount_applied, status) VALUES (?, ?, ?, ?, ?)").run(
          promo.id, req.user.id, plan_id, discountAmount, status
        );

        // Increment use count
        db.prepare("UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?").run(promo.id);

        // If free_plan, activate directly
        if (promo.type === 'free_plan') {
          const planToActivate = promo.plan_granted || plan_id;
          const monthsToAdd = planToActivate === '3m' ? 3 : (planToActivate === '6m' ? 6 : 12);
          const subEnd = new Date();
          subEnd.setMonth(subEnd.getMonth() + monthsToAdd);

          db.prepare("UPDATE users SET plan = ?, subscription_end = ? WHERE id = ?").run(
            planToActivate, subEnd.toISOString(), req.user.id
          );
        }
      })();

      if (promo.type === 'free_plan') {
        const user = db.prepare("SELECT plan, subscription_end FROM users WHERE id = ?").get(req.user.id) as any;
        return res.json({ success: true, plan_activated: true, subscription_end: user.subscription_end });
      }

      res.json({ success: true, plan_activated: false });
    } catch (error) {
      console.error("Redemption Error:", error);
      res.status(500).json({ success: false, error: "Error al procesar el canje" });
    }
  });

  // Public Endpoints
  app.get("/api/public/:slug", (req, res) => {
    const user = db.prepare("SELECT id, business_name, business_slug FROM users WHERE business_slug = ?").get(req.params.slug) as any;
    if (!user) return res.status(404).json({ error: "Rifero no encontrado" });

    const raffles = db.prepare(`
      SELECT 
        r.id, r.short_id, r.title, r.ticket_count, r.ticket_price, r.draw_date, r.currency,
        (SELECT COUNT(*) FROM tickets WHERE raffle_id = r.id AND status IN ('paid', 'reserved', 'processing')) as sold_count
      FROM raffles r
      WHERE r.user_id = ? AND r.status = 'active'
      ORDER BY r.created_at DESC
    `).all(user.id);

    res.json({ user, raffles });
  });

  app.get("/api/public/payment-status", paymentStatusLimiter, (req, res) => {
    const rawPaymentId = req.query.payment_id as string; // BUG FIX 5
    const ticketId = req.query.ticket_id as string;

    // BUG FIX 5: Normalizar payment_id vacío a null
    const paymentId = rawPaymentId && rawPaymentId.trim() !== "" 
      ? rawPaymentId.trim() 
      : null;

    if (!paymentId && !ticketId) {
      return res.status(400).json({ error: "Se requiere payment_id o ticket_id" });
    }

    // 1. Check processed_mp_payments
    if (paymentId) {
      // BUG FIX 2: Incluir payment_type_id y paid_at
      const processed = db.prepare(`
        SELECT status, payment_type_id, processed_at as paid_at, mp_payment_id, ticket_id
        FROM processed_mp_payments 
        WHERE payment_id = ?
      `).get(paymentId) as any;

      if (processed) {
        const ticket = db.prepare("SELECT number, participant_name FROM tickets WHERE id = ?").get(processed.ticket_id) as any;
        return res.json({ 
          status: processed.status === 'approved' ? 'approved' : 'rejected',
          payment_type: processed.payment_type_id, // BUG FIX 2
          paid_at: processed.paid_at, // BUG FIX 2
          mp_payment_id: processed.mp_payment_id,
          ticket_number: ticket?.number,
          participant_name: ticket?.participant_name
        });
      }
    }

    // FALLBACK: Check by ticket_id if paymentId is null or not found
    if (ticketId) {
      const processedByTicket = db.prepare(`
        SELECT status, payment_type_id, processed_at as paid_at, mp_payment_id
        FROM processed_mp_payments 
        WHERE ticket_id = ?
        ORDER BY processed_at DESC LIMIT 1
      `).get(ticketId) as any;

      if (processedByTicket) {
        const ticket = db.prepare("SELECT number, participant_name FROM tickets WHERE id = ?").get(ticketId) as any;
        return res.json({ 
          status: processedByTicket.status === 'approved' ? 'approved' : 'rejected',
          payment_type: processedByTicket.payment_type_id, // BUG FIX 2
          paid_at: processedByTicket.paid_at, // BUG FIX 2
          mp_payment_id: processedByTicket.mp_payment_id,
          ticket_number: ticket?.number,
          participant_name: ticket?.participant_name
        });
      }
    }

    // 2. Check ticket status directly (for pending/processing)
    const ticket = db.prepare("SELECT number, participant_name, status FROM tickets WHERE id = ?").get(ticketId) as any;
    if (!ticket) return res.status(404).json({ error: "Ticket no encontrado" });

    if (ticket.status === 'paid') {
      return res.json({ 
        status: 'approved',
        ticket_number: ticket.number,
        participant_name: ticket.participant_name
      });
    } else if (ticket.status === 'processing') {
      return res.json({ 
        status: 'pending_webhook',
        ticket_number: ticket.number,
        participant_name: ticket.participant_name
      });
    } else {
      return res.json({ 
        status: 'rejected',
        ticket_number: ticket.number,
        participant_name: ticket.participant_name
      });
    }
  });

  app.get("/api/public/:slug/:shortId", (req, res) => {
    const user = db.prepare("SELECT id, business_name, business_slug, phone, bank_name, bank_clabe, bank_account_holder, bank_alias, mp_checkout_enabled FROM users WHERE business_slug = ?").get(req.params.slug) as any;
    if (!user) return res.status(404).json({ error: "Rifero no encontrado" });

    const raffle = db.prepare("SELECT * FROM raffles WHERE short_id = ? AND user_id = ?").get(req.params.shortId, user.id) as any;
    if (!raffle) return res.status(404).json({ error: "Rifa no encontrada" });

    const tickets = db.prepare(`
      SELECT t.id, t.number, t.status, GROUP_CONCAT(o.number) as opportunities
      FROM tickets t
      LEFT JOIN ticket_opportunities o ON t.id = o.ticket_id
      WHERE t.raffle_id = ?
      GROUP BY t.id
    `).all(raffle.id);

    const mpCreds = db.prepare("SELECT mp_user_id FROM mp_credentials WHERE user_id = ?").get(user.id);

    // Don't expose user private info
    const publicUser = {
      business_name: user.business_name,
      business_slug: user.business_slug,
      phone: user.phone,
      bank_name: user.bank_name,
      bank_clabe: user.bank_clabe,
      bank_account_holder: user.bank_account_holder,
      bank_alias: user.bank_alias,
      mp_enabled: !!mpCreds && user.mp_checkout_enabled === 1
    };

    res.json({ user: publicUser, raffle: { ...raffle, tickets } });
  });

  app.post("/api/public/:slug/:shortId/reserve", (req, res) => {
    const { ticket_id, participant_name, participant_whatsapp } = req.body;
    
    const user = db.prepare("SELECT id FROM users WHERE business_slug = ?").get(req.params.slug) as any;
    if (!user) return res.status(404).json({ error: "Rifero no encontrado" });

    const raffle = db.prepare("SELECT id FROM raffles WHERE short_id = ? AND user_id = ?").get(req.params.shortId, user.id) as any;
    if (!raffle) return res.status(404).json({ error: "Rifa no encontrada" });

    try {
      db.transaction(() => {
        const stmt = db.prepare("UPDATE tickets SET participant_name = ?, participant_whatsapp = ?, status = 'reserved', reserved_at = CURRENT_TIMESTAMP WHERE id = ? AND raffle_id = ? AND status = 'available'");
        const info = stmt.run(participant_name, participant_whatsapp, ticket_id, raffle.id);

        if (info.changes === 0) {
          throw new Error("already_taken");
        }
      })();

      const updatedTicket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticket_id);
      res.json({ success: true, ticket: updatedTicket });
    } catch (error: any) {
      if (error.message === "already_taken") {
        res.status(400).json({ error: "already_taken" });
      } else {
        res.status(500).json({ error: "Error al reservar" });
      }
    }
  });

  app.post("/api/public/:slug/:shortId/checkout", async (req, res) => {
    const { ticket_id, participant_name, participant_whatsapp } = req.body;
    
    const user = db.prepare("SELECT id, business_slug FROM users WHERE business_slug = ?").get(req.params.slug) as any;
    if (!user) return res.status(404).json({ error: "Rifero no encontrado" });

    const raffle = db.prepare("SELECT id, title, ticket_price, currency FROM raffles WHERE short_id = ? AND user_id = ?").get(req.params.shortId, user.id) as any;
    if (!raffle) return res.status(404).json({ error: "Rifa no encontrada" });

    const mpCreds = db.prepare("SELECT access_token_encrypted FROM mp_credentials WHERE user_id = ?").get(user.id) as any;
    if (!mpCreds) return res.status(400).json({ error: "El rifero no tiene Mercado Pago conectado" });

    try {
      let ticket: any;
      db.transaction(() => {
        const stmt = db.prepare("UPDATE tickets SET participant_name = ?, participant_whatsapp = ?, status = 'processing', locked_at = CURRENT_TIMESTAMP WHERE id = ? AND raffle_id = ? AND status = 'available'");
        const info = stmt.run(participant_name, participant_whatsapp, ticket_id, raffle.id);

        if (info.changes === 0) {
          throw new Error("already_taken");
        }
        ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticket_id);
      })();

      const accessToken = decrypt(mpCreds.access_token_encrypted);
      const fee = raffle.ticket_price * (MP_MARKETPLACE_FEE_PERCENT / 100);

      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{
            title: `Boleto #${ticket.number} - ${raffle.title}`,
            unit_price: raffle.ticket_price,
            quantity: 1,
            currency_id: raffle.currency || "MXN"
          }],
          payer: {
            name: participant_name,
          },
          back_urls: {
            success: `${APP_URL}/${user.business_slug}/${req.params.shortId}?paid=true&ticket_id=${ticket.id}`,
            failure: `${APP_URL}/${user.business_slug}/${req.params.shortId}?paid=false&ticket_id=${ticket.id}`,
            pending: `${APP_URL}/${user.business_slug}/${req.params.shortId}?paid=pending&ticket_id=${ticket.id}`,
          },
          auto_return: "approved",
          notification_url: `${APP_URL}/api/mp/webhook`,
          marketplace_fee: fee,
          metadata: {
            ticket_id: ticket.id,
            raffle_id: raffle.id,
            participant_whatsapp
          },
          external_reference: String(ticket.id)
        }),
      });

      const preference = await response.json();
      if (preference.error) throw new Error(preference.message || preference.error);

      // FIX 1: Guardar referencia para el webhook
      db.prepare(`
        INSERT INTO mp_payment_refs (preference_id, ticket_id, user_id)
        VALUES (?, ?, ?)
      `).run(preference.id, ticket.id, user.id);

      res.json({ preference_id: preference.id, init_point: preference.init_point });
    } catch (error: any) {
      console.error("Checkout Error:", error);
      if (error.message === "already_taken") {
        res.status(400).json({ error: "already_taken" });
      } else {
        res.status(500).json({ error: "Error al crear preferencia de pago" });
      }
    }
  });

  app.post("/api/mp/webhook", async (req, res) => {
    // 1. Validar firma (si el secreto está configurado)
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (webhookSecret) {
      if (!validateMPSignature(req, webhookSecret)) {
        const xSignature = (req.headers['x-signature'] as string) || '';
        console.warn('[MP Webhook] Firma inválida detectada', {
          ip: req.ip,
          timestamp: new Date().toISOString(),
          signature: xSignature.substring(0, 20) + '...'
        });
        return res.sendStatus(400);
      }
    } else {
      console.warn('[MP Webhook] Firma no validada — configura MP_WEBHOOK_SECRET para mayor seguridad');
    }

    const paymentId = req.body.data?.id || req.query.id;
    const action = req.body.action || req.query.topic; // Handle both formats
    
    console.log('[MP Webhook] Received notification', { 
      paymentId, 
      action,
      body: JSON.stringify(req.body),
      query: JSON.stringify(req.query)
    });

    if (!paymentId) return res.sendStatus(200);

    try {
      // BUG 2 & FIX 2: Idempotencia - Verificar si ya fue procesado
      const alreadyProcessed = db.prepare("SELECT id FROM processed_mp_payments WHERE payment_id = ?").get(paymentId);
      if (alreadyProcessed) {
        console.log('[MP Webhook] Payment already processed', { paymentId });
        return res.sendStatus(200);
      }

      // FIX 1: Obtener el pago usando credenciales de la plataforma para resolver el seller
      const platformToken = process.env.MP_ACCESS_TOKEN;
      if (!platformToken) {
        console.error('[MP Webhook] MP_ACCESS_TOKEN no está configurado. Imposible consultar pagos.');
        return res.sendStatus(200);
      }
      const initialResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { "Authorization": `Bearer ${platformToken}` }
      });
      
      if (!initialResponse.ok) {
        console.error('[MP Webhook] Error fetching payment with platform token', { status: initialResponse.status, paymentId });
        return res.sendStatus(200);
      }

      const payment = await initialResponse.json();
      const preferenceId = payment.preference_id;

      if (!preferenceId) {
        console.log('[MP Webhook] No preference_id found in payment details', { paymentId });
        return res.sendStatus(200);
      }

      // Resolver seller y ticket usando mp_payment_refs
      const ref = db.prepare("SELECT ticket_id, user_id FROM mp_payment_refs WHERE preference_id = ?").get(preferenceId) as any;
      if (!ref) {
        console.log('[MP Webhook] No internal reference found for preference', { preferenceId, paymentId });
        return res.sendStatus(200);
      }

      const status = payment.status;
      console.log('[MP Webhook] Processing payment', { paymentId, ticketId: ref.ticket_id, status });

      // Si el status es pending o in_process, no hacemos nada
      const isUpdate = action === 'payment.updated'; // FIX
      if ((status === 'pending' || status === 'in_process') && !isUpdate) { // FIX
        return res.sendStatus(200);
      }

      // FIX 2 & 3: Transacción para asegurar consistencia e idempotencia
      db.transaction(() => {
        // Doble check de idempotencia dentro de la transacción
        const exists = db.prepare("SELECT id FROM processed_mp_payments WHERE payment_id = ?").get(paymentId);
        if (exists) return;

        if (status === 'approved') {
          // Marcar ticket como pagado y registrar payment_id
          db.prepare(`
            UPDATE tickets 
            SET status = 'paid', paid_at = CURRENT_TIMESTAMP, locked_at = NULL, mp_payment_id = ? 
            WHERE id = ? AND status IN ('processing', 'reserved') -- FIX
          `).run(paymentId, ref.ticket_id);
          console.log('[MP Webhook] Payment approved and ticket updated', { paymentId, ticketId: ref.ticket_id });
        } else if (status === 'rejected' || status === 'cancelled') {
          // FIX 2: mp_payment_id = NULL al liberar boleto rechazado
          db.prepare(`
            UPDATE tickets 
            SET status = 'available', participant_name = NULL, participant_whatsapp = NULL, locked_at = NULL, mp_payment_id = NULL 
            WHERE id = ? AND status = 'processing'
          `).run(ref.ticket_id);
          console.log('[MP Webhook] Payment rejected/cancelled and ticket released', { paymentId, ticketId: ref.ticket_id, status });
        }

        // Registrar en tabla de pagos procesados
        db.prepare(`
          INSERT INTO processed_mp_payments (payment_id, ticket_id, status, payment_type_id) -- BUG FIX 2
          VALUES (?, ?, ?, ?) -- BUG FIX 2
        `).run(paymentId, ref.ticket_id, status, payment.payment_type_id); // BUG FIX 2
      })();

    } catch (error) {
      console.error('[MP Webhook] Unexpected Error:', error);
    }
    
    res.sendStatus(200);
  });

  // Cleanup Job: Expired Locks
  setInterval(() => {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    db.prepare("UPDATE tickets SET status = 'available', participant_name = NULL, participant_whatsapp = NULL, locked_at = NULL WHERE status = 'processing' AND locked_at < ?").run(fifteenMinsAgo);
  }, 5 * 60 * 1000); // Every 5 minutes

  // Run cleanup on start
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  db.prepare("UPDATE tickets SET status = 'available', participant_name = NULL, participant_whatsapp = NULL, locked_at = NULL WHERE status = 'processing' AND locked_at < ?").run(fifteenMinsAgo);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
