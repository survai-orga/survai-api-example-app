import fs from 'fs/promises';
import path from 'path';
import { CONFIG } from '../config.js';
import type {
	Survey,
	Question,
	Answer,
	Evaluation,
	EvaluatedAnswer,
	Webhook,
	CodeFrameNode
} from '../api/client.js';

async function ensureDataDir() {
	await fs.mkdir(CONFIG.storage.dataDir, { recursive: true }).catch(() => {});
}

class JsonCollection<T extends { id?: string }> {
	private filename: string;
	private key: string;

	constructor(filename: string, key: string) {
		this.filename = filename;
		this.key = key;
	}

	private get filepath() {
		return path.join(CONFIG.storage.dataDir, this.filename);
	}

	async readAll(): Promise<T[]> {
		try {
			const content = await fs.readFile(this.filepath, 'utf-8');
			const data = JSON.parse(content);
			return data[this.key] || [];
		} catch {
			return [];
		}
	}

	async writeAll(items: T[]): Promise<void> {
		await ensureDataDir();
		await fs.writeFile(this.filepath, JSON.stringify({ [this.key]: items }, null, 2), 'utf-8');
	}

	async save(item: T): Promise<void> {
		const items = await this.readAll();
		const index = item.id ? items.findIndex((i) => i.id === item.id) : -1;

		if (index !== -1) {
			items[index] = item;
		} else {
			items.push(item);
		}

		await this.writeAll(items);
	}

	async saveMany(newItems: T[]): Promise<void> {
		const items = await this.readAll();
		items.push(...newItems);
		await this.writeAll(items);
	}

	async find(id: string): Promise<T | null> {
		const items = await this.readAll();
		return items.find((i) => i.id === id) || null;
	}

	async update(id: string, updates: Partial<T>): Promise<void> {
		const items = await this.readAll();
		const index = items.findIndex((i) => i.id === id);
		if (index !== -1) {
			items[index] = { ...items[index], ...updates };
			await this.writeAll(items);
		}
	}
}

interface ConfigData {
	apiKey?: string;
	webhookId?: string;
	webhookSecret?: string;
	webhookUrl?: string;
}

interface StoredCodeFrame {
	id?: string;
	questionId: string;
	codeFrame: CodeFrameNode[];
	tierCount: number;
	totalCodes: number;
	created: string;
}

interface WebhookEvent {
	id?: string;
	event: string;
	data: Record<string, unknown>;
	receivedAt?: string;
}

const surveys = new JsonCollection<Survey>('surveys.json', 'surveys');
const questions = new JsonCollection<Question>('questions.json', 'questions');
const answers = new JsonCollection<Answer & { id?: string }>('answers.json', 'answers');
const evaluations = new JsonCollection<Evaluation>('evaluations.json', 'evaluations');
const evaluatedAnswers = new JsonCollection<EvaluatedAnswer>('evaluated-answers.json', 'evaluatedAnswers');
const webhooks = new JsonCollection<Webhook>('webhooks.json', 'webhooks');
const codeFrames = new JsonCollection<StoredCodeFrame>('codeframes.json', 'codeFrames');
const webhookEvents = new JsonCollection<WebhookEvent>('webhook-events.json', 'events');

export async function saveConfig(config: ConfigData): Promise<void> {
	await ensureDataDir();
	const filepath = path.join(CONFIG.storage.dataDir, 'config.json');
	await fs.writeFile(filepath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function getConfig(): Promise<ConfigData> {
	try {
		const filepath = path.join(CONFIG.storage.dataDir, 'config.json');
		const content = await fs.readFile(filepath, 'utf-8');
		return JSON.parse(content);
	} catch {
		return {};
	}
}

export const saveSurvey = (s: Survey) => surveys.save(s);
export const getSurveys = () => surveys.readAll();
export const getSurvey = (id: string) => surveys.find(id);

export const saveQuestion = (q: Question) => questions.save(q);
export const getQuestions = () => questions.readAll();
export const getQuestion = (id: string) => questions.find(id);
export const updateQuestion = (id: string, updates: Partial<Question>) => questions.update(id, updates);

export const saveAnswers = (a: (Answer & { id?: string })[]) => answers.saveMany(a);
export const getAnswers = () => answers.readAll();

export const saveEvaluation = (e: Evaluation) => evaluations.save(e);
export const getEvaluations = () => evaluations.readAll();
export const getEvaluation = (id: string) => evaluations.find(id);
export const updateEvaluation = (id: string, updates: Partial<Evaluation>) => evaluations.update(id, updates);

export const saveEvaluatedAnswers = (ea: EvaluatedAnswer[]) => evaluatedAnswers.saveMany(ea);
export const getEvaluatedAnswers = () => evaluatedAnswers.readAll();

export const saveWebhook = (w: Webhook) => webhooks.save(w);
export const getWebhooks = () => webhooks.readAll();

export const saveCodeFrame = (cf: StoredCodeFrame) => codeFrames.save(cf);
export const getCodeFrames = () => codeFrames.readAll();

export async function saveWebhookEvent(event: WebhookEvent): Promise<void> {
	await webhookEvents.save({ ...event, receivedAt: new Date().toISOString() });
}

export const getWebhookEvents = () => webhookEvents.readAll();

export async function getLatestWebhookEvent(eventType: string): Promise<WebhookEvent | null> {
	const events = await getWebhookEvents();
	const filtered = events.filter((e) => e.event === eventType);
	return filtered.length > 0 ? filtered[filtered.length - 1] : null;
}

export async function clearAllData(): Promise<void> {
	const files = [
		'config.json', 'surveys.json', 'questions.json', 'answers.json',
		'codeframes.json', 'evaluations.json', 'evaluated-answers.json',
		'webhooks.json', 'webhook-events.json'
	];

	for (const file of files) {
		await fs.unlink(path.join(CONFIG.storage.dataDir, file)).catch(() => {});
	}
}
