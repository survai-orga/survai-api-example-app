import crypto from 'crypto';

/**
 * Verify webhook signature using HMAC SHA-256
 * @param payloadString The raw webhook payload string (not parsed object!)
 * @param signature The signature from X-SurvAI-Signature header
 * @param secret The webhook secret
 * @returns true if signature is valid
 */
export function verifySignature(
  payloadString: string,
  signature: string,
  secret: string
): boolean {
  // Remove 'sha256=' prefix if present
  const receivedSignature = signature.startsWith('sha256=')
    ? signature.substring(7)
    : signature;

  // Compute expected signature from raw payload string
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    // timingSafeEqual throws if buffers are different lengths
    return false;
  }
}
