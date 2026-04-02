import crypto from 'crypto';
import { Request } from 'express';

/**
 * Validates the Mercado Pago webhook signature.
 * 
 * Mercado Pago Implementation Details:
 * - MP signs a combination of 'data.id' (from query params), 'x-request-id' (header), and 'ts' (header).
 * - IMPORTANT: MP does NOT sign the raw body in its current implementation (as of 2024).
 * - Therefore, express.json() processing the body before this validation does NOT affect the result.
 * - If MP adds body signing in the future, you must capture the rawBody using a verify callback in express.json:
 * 
 *   app.use(express.json({ 
 *     verify: (req, res, buf) => { (req as any).rawBody = buf; } 
 *   }));
 * 
 * Documentation: https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/additional-content/your-integrations/notifications/webhooks
 */
export function validateMPSignature(req: Request, secret: string): boolean {
  const xSignature = req.headers['x-signature'] as string;
  const xRequestId = req.headers['x-request-id'] as string;

  if (!xSignature) {
    return false;
  }

  // 1. Extract ts and v1 from x-signature
  // Example: ts=1742505638683,v1=ced36ab6d33566bb1e16c125819b8d840d6b8ef136b0b9127c76064466f5229b
  const parts = xSignature.split(',');
  let ts: string | undefined;
  let v1: string | undefined;

  parts.forEach(part => {
    const [key, value] = part.trim().split('=');
    if (key === 'ts') ts = value;
    if (key === 'v1') v1 = value;
  });

  if (!ts || !v1) {
    return false;
  }

  // 2. Validate timestamp tolerance (5 minutes)
  // Mercado Pago may send 'ts' in seconds (10 digits) or milliseconds (13 digits).
  // We detect the unit by length to ensure correct comparison with Date.now() (ms).
  const tsMs = ts.length <= 10 ? Number(ts) * 1000 : Number(ts);
  
  if (isNaN(tsMs) || Math.abs(Date.now() - tsMs) > 300000) {
    return false;
  }

  // 3. Extract data.id from query (Mercado Pago sends it as data.id in query)
  const dataId = req.query['data.id'] as string;

  // 4. Build the template
  // id:{dataId};request-id:{xRequestId};ts:{ts};
  // IMPORTANT: Use the ORIGINAL 'ts' string from the header as MP used it for signing.
  let manifest = "";
  if (dataId) manifest += `id:${dataId};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  if (ts) manifest += `ts:${ts};`;

  // 5. Calculate HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(manifest);
  const calculatedHash = hmac.digest('hex');

  // 6. Secure comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHash, 'utf-8'),
      Buffer.from(v1, 'utf-8')
    );
  } catch (e) {
    return false;
  }
}
