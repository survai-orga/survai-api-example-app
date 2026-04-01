import axios, { AxiosInstance, AxiosError } from 'axios';
import { CONFIG } from '../config.js';

export interface Survey {
	id: string;
	name: string;
	comment?: string;
	created: string;
}

export interface Question {
	id: string;
	surveyId: string;
	question_text: string;
	question_name: string;
	additional_instruction?: string;
	code_frame?: CodeFrameNode[];
}

export interface CodeFrameNode {
	id: string;
	name: string;
	tier: number;
	order: number;
	children?: CodeFrameNode[];
}

export interface Answer {
	customer_id: string;
	answer_text: string;
}

export interface Evaluation {
	id: string;
	questionId: string;
	name: string;
	totalAnswers: number;
	processedAnswers: number;
	is_completed: boolean;
	started?: string;
	completed?: string;
}

export interface EvaluatedAnswer {
	id: string;
	answerId: string;
	answer_text: string;
	codings: Coding[];
}

export interface Coding {
	code_path: string;
	textbits: string[];
	tier?: number;
}

export interface Webhook {
	id: string;
	url: string;
	name: string;
	events: string[];
	secret: string;
}

export class SurvAIClient {
	private client: AxiosInstance;

	constructor(apiKey?: string) {
		this.client = axios.create({
			baseURL: CONFIG.api.baseUrl,
			timeout: CONFIG.api.timeout,
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': apiKey || CONFIG.api.apiKey || ''
			}
		});

		this.client.interceptors.request.use((request) => {
			console.log(`→ ${request.method?.toUpperCase()} ${request.url}`);
			if (request.data && Object.keys(request.data).length > 0) {
				const truncated = JSON.stringify(request.data).substring(0, 200);
				console.log(`  Body: ${truncated}${truncated.length >= 200 ? '...' : ''}`);
			}
			return request;
		});

		this.client.interceptors.response.use(
			(response) => {
				console.log(`← ${response.status} ${response.config.url}`);
				return response;
			},
			(error: AxiosError) => {
				const method = error.config?.method?.toUpperCase() || 'REQUEST';
				const url = error.config?.url || 'unknown';
				console.error(`✗ ${method} ${url}`);

				if (error.response) {
					console.error(`  Status: ${error.response.status}`);
					console.error(`  Error: ${JSON.stringify(error.response.data)}`);
				} else if (error.request) {
					console.error('  No response received');
				} else {
					console.error(`  Error: ${error.message}`);
				}

				throw error;
			}
		);
	}

	async createSurvey(data: { name: string; comment?: string }): Promise<{ survey: Survey }> {
		const response = await this.client.post('/api/v1/surveys', data);
		return response.data;
	}

	async importSurvey(surveyData: {
		name: string;
		comment?: string;
		questions: Array<{
			question_text: string;
			question_name?: string;
			additional_instruction?: string;
			notes?: string;
			answers: Answer[];
		}>;
	}): Promise<{ surveyId: string; message: string }> {
		const response = await this.client.post('/api/v1/surveys/import', { surveyData });
		return response.data;
	}

	async getSurvey(surveyId: string): Promise<{ survey: Survey }> {
		const response = await this.client.get(`/api/v1/surveys/${surveyId}`);
		return response.data;
	}

	async deleteSurvey(surveyId: string): Promise<void> {
		await this.client.delete(`/api/v1/surveys/${surveyId}`);
	}

	async createQuestion(
		surveyId: string,
		data: { question_text: string; question_name: string; additional_instruction?: string }
	): Promise<{ question: Question }> {
		const response = await this.client.post(`/api/v1/surveys/${surveyId}/questions`, data);
		return response.data;
	}

	async getQuestion(surveyId: string, questionId: string): Promise<{ question: Question }> {
		const response = await this.client.get(`/api/v1/surveys/${surveyId}/questions/${questionId}`);
		return response.data;
	}

	async getQuestions(surveyId: string): Promise<{ questions: Question[] }> {
		const response = await this.client.get(`/api/v1/surveys/${surveyId}/questions`);
		return response.data;
	}

	async createCodeFrame(
		surveyId: string,
		questionId: string,
		data: { additionalInstruction?: string; tierCount?: number }
	): Promise<{ jobId: string; status: string }> {
		const response = await this.client.post(
			`/api/v1/surveys/${surveyId}/questions/${questionId}/code_frame`,
			data
		);
		return response.data;
	}

	async createEvaluation(
		surveyId: string,
		questionId: string,
		data: { evaluationName: string; additionalInstructionEvaluation?: string }
	): Promise<{ evaluationId: string }> {
		const response = await this.client.post(
			`/api/v1/surveys/${surveyId}/questions/${questionId}/evaluate`,
			data
		);
		return response.data;
	}

	async getEvaluation(
		surveyId: string,
		questionId: string,
		evaluationId: string,
		excludeAnswers = false
	): Promise<{ evaluation: Evaluation; evaluatedAnswers?: EvaluatedAnswer[] }> {
		const params = excludeAnswers ? { exclude: 'answers' } : {};
		const response = await this.client.get(
			`/api/v1/surveys/${surveyId}/questions/${questionId}/evaluations/${evaluationId}`,
			{ params }
		);
		return response.data;
	}

	async deleteEvaluation(surveyId: string, questionId: string, evaluationId: string): Promise<void> {
		await this.client.delete(
			`/api/v1/surveys/${surveyId}/questions/${questionId}/evaluations/${evaluationId}`
		);
	}

	async listEvaluations(surveyId: string, questionId: string): Promise<{ evaluations: Evaluation[] }> {
		const response = await this.client.get(
			`/api/v1/surveys/${surveyId}/questions/${questionId}/evaluations`
		);
		return response.data;
	}

	async continueEvaluations(
		surveyId: string,
		questionId: string,
		evaluationIds: string[],
		region?: 'eu' | 'us'
	): Promise<{
		results: Array<{
			evaluationId: string;
			success: boolean;
			jobsQueued?: number;
			totalAnswers?: number;
			alreadyEvaluated?: number;
			isTrackingSurvey?: boolean;
			error?: string;
		}>;
		summary: { total: number; succeeded: number; failed: number; totalJobsQueued: number };
	}> {
		const params = region ? { region } : {};
		const response = await this.client.post(
			`/api/v1/surveys/${surveyId}/questions/${questionId}/continue-evaluations`,
			{ evaluationIds },
			{ params }
		);
		return response.data;
	}

	async listAnswers(surveyId: string, questionId: string): Promise<{ answers: Answer[] }> {
		const response = await this.client.get(
			`/api/v1/surveys/${surveyId}/questions/${questionId}/answers`
		);
		return response.data;
	}

	async createAnswers(
		surveyId: string,
		questionId: string,
		answers: Answer | Answer[]
	): Promise<{ answers?: Answer[]; answer?: Answer; count?: number }> {
		const response = await this.client.post(
			`/api/v1/surveys/${surveyId}/questions/${questionId}/answers`,
			answers
		);
		return response.data;
	}

	async createWebhook(data: {
		url: string;
		name: string;
		events: string[];
	}): Promise<{ webhook: Webhook }> {
		const response = await this.client.post('/api/v1/webhooks', data);
		return response.data;
	}

	async listWebhooks(): Promise<{ webhooks: Webhook[] }> {
		const response = await this.client.get('/api/v1/webhooks');
		return response.data;
	}

	async deleteWebhook(webhookId: string): Promise<void> {
		await this.client.delete(`/api/v1/webhooks/${webhookId}`);
	}
}
