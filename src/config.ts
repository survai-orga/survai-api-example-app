import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
	api: {
		baseUrl: process.env.SURVAI_API_BASE_URL || 'http://localhost:5173',
		apiKey: process.env.SURVAI_API_KEY,
		firebaseToken: process.env.SURVAI_FIREBASE_TOKEN,
		timeout: 30000,
		retryAttempts: 3,
		retryDelay: 1000
	},
	webhook: {
		port: parseInt(process.env.WEBHOOK_PORT || '3000'),
		baseUrl: process.env.WEBHOOK_BASE_URL,
		secret: process.env.WEBHOOK_SECRET,
		path: '/webhooks/survai'
	},
	polling: {
		intervalMs: 5000,
		maxAttempts: 360,
		timeoutMs: 1800000
	},
	storage: {
		dataDir: process.env.DATA_DIR || './data'
	},
	logging: {
		level: process.env.LOG_LEVEL || 'info',
		file: process.env.LOG_FILE || 'logs/app.log'
	}
} as const;

export function validateConfig() {
	const errors: string[] = [];

	if (!CONFIG.api.apiKey && !CONFIG.api.firebaseToken) {
		errors.push('Either SURVAI_API_KEY or SURVAI_FIREBASE_TOKEN must be set');
	}

	if (!CONFIG.webhook.baseUrl) {
		errors.push('WEBHOOK_BASE_URL must be set (use ngrok for local development)');
	}

	if (errors.length > 0) {
		console.error('Configuration errors:');
		errors.forEach((e) => console.error(`  - ${e}`));
		console.error('\nPlease check your .env file');
		process.exit(1);
	}

	console.log('✓ Configuration validated');
}
