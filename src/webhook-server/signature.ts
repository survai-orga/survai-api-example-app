import crypto from 'crypto';

export function verifySignature(payloadString: string, signature: string, secret: string): boolean {
	const receivedSignature = signature.startsWith('sha256=') ? signature.substring(7) : signature;

	const expectedSignature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

	try {
		return crypto.timingSafeEqual(
			Buffer.from(receivedSignature, 'hex'),
			Buffer.from(expectedSignature, 'hex')
		);
	} catch {
		return false;
	}
}
