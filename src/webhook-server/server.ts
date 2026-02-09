import express from 'express';
import { verifySignature } from './signature.js';
import { handleWebhookEvent } from './handlers.js';
import { CONFIG } from '../config.js';

/**
 * Start Express webhook server to receive SurvAI notifications
 */
export function startWebhookServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = express();

    // Parse JSON bodies with raw body saved for signature verification
    app.use(express.json({
      verify: (req: any, _res, buf) => {
        // Save raw body for signature verification
        req.rawBody = buf.toString('utf8');
      }
    }));

    // Webhook endpoint
    app.post(CONFIG.webhook.path, async (req: any, res) => {
      const signature = req.headers['x-survai-signature'] as string;
      const deliveryId = req.headers['x-survai-delivery-id'] as string;

      // Validate signature presence
      if (!signature) {
        console.error('✗ Webhook: Missing signature header');
        return res.status(401).json({ error: 'Missing X-SurvAI-Signature header' });
      }

      // Verify webhook signature
      if (!CONFIG.webhook.secret) {
        console.error('✗ Webhook: No webhook secret configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      // Use raw body for signature verification (critical!)
      if (!verifySignature(req.rawBody || JSON.stringify(req.body), signature, CONFIG.webhook.secret)) {
        console.error('✗ Webhook: Invalid signature');
        console.error(`  Delivery ID: ${deliveryId}`);
        console.error(`  Event: ${req.body.event}`);
        console.error(`  Signature: ${signature.substring(0, 20)}...`);
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      // Log receipt
      const eventType = req.body.event || 'unknown';
      console.log(`✓ Webhook received: ${eventType}`);
      if (deliveryId) {
        console.log(`  Delivery ID: ${deliveryId}`);
      }

      // Handle event
      try {
        await handleWebhookEvent(req.body);
        res.status(200).json({ received: true });
      } catch (error) {
        console.error('✗ Webhook handler error:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
      }
    });

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'ok',
        service: 'survai-api-example-webhook',
        timestamp: new Date().toISOString()
      });
    });

    // Catch-all for unsupported routes
    app.all('*', (_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Start server
    app.listen(CONFIG.webhook.port, () => {
      console.log(`✓ Webhook server listening on port ${CONFIG.webhook.port}`);
      console.log(`  Endpoint: ${CONFIG.webhook.baseUrl}${CONFIG.webhook.path}`);
      console.log(`  Health check: http://localhost:${CONFIG.webhook.port}/health`);
      resolve();
    });
  });
}
