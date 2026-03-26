import express from 'express';
import { verifySignature } from './signature.js';
import { handleWebhookEvent } from './handlers.js';
import { CONFIG } from '../config.js';

export function startWebhookServer(): Promise<void> {
	return new Promise((resolve) => {
		const app = express();

		app.use(
			express.json({
				verify: (req: any, _res, buf) => {
					req.rawBody = buf.toString('utf8');
				}
			})
		);

		app.post(CONFIG.webhook.path, async (req: any, res): Promise<void> => {
			const signature = req.headers['x-survai-signature'] as string;
			const deliveryId = req.headers['x-survai-delivery-id'] as string;

			if (!signature) {
				console.error('✗ Webhook: Missing signature header');
				res.status(401).json({ error: 'Missing X-SurvAI-Signature header' });
				return;
			}

			if (!CONFIG.webhook.secret) {
				console.error('✗ Webhook: No webhook secret configured');
				res.status(500).json({ error: 'Webhook secret not configured' });
				return;
			}

			if (!verifySignature(req.rawBody || JSON.stringify(req.body), signature, CONFIG.webhook.secret)) {
				console.error(`✗ Webhook: Invalid signature (delivery: ${deliveryId})`);
				res.status(401).json({ error: 'Invalid webhook signature' });
				return;
			}

			console.log(`✓ Webhook received: ${req.body.event || 'unknown'}${deliveryId ? ` (${deliveryId})` : ''}`);

			try {
				await handleWebhookEvent(req.body);
				res.status(200).json({ received: true });
			} catch (error) {
				console.error('✗ Webhook handler error:', error);
				res.status(500).json({ error: 'Failed to process webhook' });
			}
		});

		app.get('/health', (_req, res) => {
			res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
		});

		app.all('*', (_req, res) => {
			res.status(404).json({ error: 'Not found' });
		});

		app.listen(CONFIG.webhook.port, () => {
			console.log(`✓ Webhook server listening on port ${CONFIG.webhook.port}`);
			console.log(`  Endpoint: ${CONFIG.webhook.baseUrl}${CONFIG.webhook.path}`);
			resolve();
		});
	});
}
