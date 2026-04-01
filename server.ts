import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("kouun.db");
const JWT_SECRET = process.env.JWT_SECRET || "kouun-secret-key";

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'trial',
    subscription_end DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS raffles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
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
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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
  app.post("/api/auth/register", async (req, res) => {
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

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } });
  });

  app.get("/api/user/profile", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT id, email, name, plan, subscription_end FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
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

    const stmt = db.prepare(`
      INSERT INTO raffles (user_id, title, description, type, ticket_count, opportunities_per_ticket, distribution_type, ticket_price, currency, draw_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(req.user.id, title, description, type, ticket_count, opportunities_per_ticket, distribution_type, ticket_price, currency, draw_date);
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
