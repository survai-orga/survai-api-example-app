import type { CodeFrameNode, Evaluation, EvaluatedAnswer, Question } from './api/client.js';

export interface WebhookEvent {
	event: string;
	timestamp: string;
	data: Record<string, unknown>;
	receivedAt?: string;
}

export interface CodeFrameCreatedEvent extends WebhookEvent {
	event: 'code_frame.created';
	data: {
		surveyId: string;
		questionId: string;
		tierCount: number;
		codeFrame: CodeFrameNode[];
	};
}

export interface CodeFrameFailedEvent extends WebhookEvent {
	event: 'code_frame.failed';
	data: {
		questionId: string;
		error: string;
	};
}

export interface EvaluationStartedEvent extends WebhookEvent {
	event: 'evaluation.started';
	data: {
		evaluationId: string;
		totalAnswers: number;
		estimatedDuration?: string;
	};
}

export interface EvaluationProgressEvent extends WebhookEvent {
	event: 'evaluation.progress';
	data: {
		evaluationId: string;
		processedAnswers: number;
		totalAnswers: number;
		progress: number;
	};
}

export interface EvaluationCompletedEvent extends WebhookEvent {
	event: 'evaluation.completed';
	data: {
		evaluationId: string;
		questionId: string;
		totalAnswers: number;
		processedAnswers: number;
		duration?: string;
	};
}

export interface EvaluationFailedEvent extends WebhookEvent {
	event: 'evaluation.failed';
	data: {
		evaluationId: string;
		error: string;
		processedAnswers: number;
		totalAnswers: number;
	};
}

export type SurvAIWebhookEvent =
	| CodeFrameCreatedEvent
	| CodeFrameFailedEvent
	| EvaluationStartedEvent
	| EvaluationProgressEvent
	| EvaluationCompletedEvent
	| EvaluationFailedEvent;

export interface ReportData {
	survey: { id: string; name: string };
	question: Question;
	evaluation: Evaluation;
	codeFrame: CodeFrameNode[];
	evaluatedAnswers: EvaluatedAnswer[];
}

export interface ExportMetadata {
	surveyName?: string;
	questionText?: string;
}

export interface ReportStatistics {
	overview: {
		totalAnswers: number;
		answersWithCodings: number;
		answersWithoutCodings: number;
		totalCodings: number;
		avgCodingsPerAnswer: string | number;
		codingRate: number;
	};
	topCategories: Array<{
		codePath: string;
		count: number;
		percentage: number;
	}>;
	tierDistribution: Array<{
		tier: number;
		count: number;
		percentage: number;
	}>;
	codingDistribution: Array<{
		codingsPerAnswer: number;
		answerCount: number;
		percentage: number;
	}>;
}
