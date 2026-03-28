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

function createCollection<T>(filename: string, key: string) {
	const filepath = path.join(CONFIG.storage.dataDir, filename);

	const getId = (item: T) => (item as { id?: string }).id;

	const readAll = async (): Promise<T[]> => {
		try {
			const data = JSON.parse(await fs.readFile(filepath, 'utf-8'));
			return data[key] || [];
		} catch {
			return [];
		}
	};

	const writeAll = async (items: T[]): Promise<void> => {
		await ensureDataDir();
		await fs.writeFile(filepath, JSON.stringify({ [key]: items }, null, 2), 'utf-8');
	};

	const save = async (item: T): Promise<void> => {
		const items = await readAll();
		const itemId = getId(item);
		const index = itemId ? items.findIndex((i) => getId(i) === itemId) : -1;

		if (index !== -1) {
			items[index] = item;
		} else {
			items.push(item);
		}

		await writeAll(items);
	};

	const saveMany = async (newItems: T[]): Promise<void> => {
		const items = await readAll();
		items.push(...newItems);
		await writeAll(items);
	};

	const find = async (id: string): Promise<T | null> => {
		const items = await readAll();
		return items.find((i) => getId(i) === id) || null;
	};

	const update = async (id: string, updates: Partial<T>): Promise<void> => {
		const items = await readAll();
		const index = items.findIndex((i) => getId(i) === id);
		if (index !== -1) {
			items[index] = { ...items[index], ...updates };
			await writeAll(items);
		}
	};

	return { readAll, save, saveMany, find, update };
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

export interface StoredWebhookEvent {
	event: string;
	timestamp?: string;
	data: Record<string, unknown>;
	receivedAt?: string;
}

const surveys = createCollection<Survey>('surveys.json', 'surveys');
const questions = createCollection<Question>('questions.json', 'questions');
const answers = createCollection<Answer>('answers.json', 'answers');
const evaluations = createCollection<Evaluation>('evaluations.json', 'evaluations');
const evaluatedAnswers = createCollection<EvaluatedAnswer>('evaluated-answers.json', 'evaluatedAnswers');
const webhooks = createCollection<Webhook>('webhooks.json', 'webhooks');
const codeFrames = createCollection<StoredCodeFrame>('codeframes.json', 'codeFrames');
const webhookEvents = createCollection<StoredWebhookEvent>('webhook-events.json', 'events');

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

export const saveAnswers = (a: Answer[]) => answers.saveMany(a);
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

export async function saveWebhookEvent(event: StoredWebhookEvent): Promise<void> {
	await webhookEvents.save({ ...event, receivedAt: new Date().toISOString() });
}

export const getWebhookEvents = () => webhookEvents.readAll();

export async function getLatestWebhookEvent(eventType: string): Promise<StoredWebhookEvent | null> {
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
