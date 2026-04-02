import crypto from 'crypto';
import { Request } from 'express';

/**
 * Validates the Mercado Pago webhook signature.
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
  const timestamp = Number(ts);
  if (isNaN(timestamp) || Math.abs(Date.now() - timestamp) > 300000) {
    return false;
  }

  // 3. Extract data.id from query (Mercado Pago sends it as data.id in query)
  const dataId = req.query['data.id'] as string;

  // 4. Build the template
  // id:{dataId};request-id:{xRequestId};ts:{ts};
  // Omit any field that is not present in the notification
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
