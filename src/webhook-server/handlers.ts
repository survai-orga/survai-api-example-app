import * as db from '../storage/db.js';
import { countTotalCodes } from '../utils/code-frame.js';
import type {
	SurvAIWebhookEvent,
	CodeFrameCreatedEvent,
	CodeFrameFailedEvent,
	EvaluationStartedEvent,
	EvaluationProgressEvent,
	EvaluationCompletedEvent,
	EvaluationFailedEvent
} from '../types.js';

export async function handleWebhookEvent(event: SurvAIWebhookEvent): Promise<void> {
	await db.saveWebhookEvent(event);

	switch (event.event) {
		case 'code_frame.created':
			return handleCodeFrameCreated(event);
		case 'code_frame.failed':
			return handleCodeFrameFailed(event);
		case 'evaluation.started':
			return handleEvaluationStarted(event);
		case 'evaluation.progress':
			return handleEvaluationProgress(event);
		case 'evaluation.completed':
			return handleEvaluationCompleted(event);
		case 'evaluation.failed':
			return handleEvaluationFailed(event);
		default:
			console.log(`  ℹ Unhandled event type: ${(event as SurvAIWebhookEvent).event}`);
	}
}

async function handleCodeFrameCreated(event: CodeFrameCreatedEvent): Promise<void> {
	const { questionId, codeFrame, tierCount } = event.data;

	console.log('  ✓ Code frame created successfully');
	console.log(`    Question: ${questionId}`);
	console.log(`    Tiers: ${tierCount}`);
	console.log(`    Total codes: ${countTotalCodes(codeFrame)}`);

	await db.saveCodeFrame({
		questionId,
		codeFrame,
		tierCount,
		totalCodes: countTotalCodes(codeFrame),
		created: event.timestamp
	});
}

async function handleCodeFrameFailed(event: CodeFrameFailedEvent): Promise<void> {
	const { questionId, error } = event.data;
	console.error(`  ✗ Code frame creation failed for ${questionId}: ${error}`);
}

async function handleEvaluationStarted(event: EvaluationStartedEvent): Promise<void> {
	const { evaluationId, totalAnswers, estimatedDuration } = event.data;

	console.log(`  ✓ Evaluation started: ${evaluationId} (${totalAnswers} answers)`);
	if (estimatedDuration) console.log(`    Estimated: ${estimatedDuration}`);
}

async function handleEvaluationProgress(event: EvaluationProgressEvent): Promise<void> {
	const { processedAnswers, totalAnswers, progress } = event.data;
	const pct = progress || 0;
	const filled = Math.round((pct / 100) * 50);
	const bar = `[${'='.repeat(filled)}${' '.repeat(50 - filled)}]`;
	console.log(`  📊 Progress: ${bar} ${pct}% (${processedAnswers}/${totalAnswers})`);
}

async function handleEvaluationCompleted(event: EvaluationCompletedEvent): Promise<void> {
	const { processedAnswers, totalAnswers } = event.data;
	console.log(`  ✓ Evaluation completed: ${processedAnswers}/${totalAnswers} answers`);
}

async function handleEvaluationFailed(event: EvaluationFailedEvent): Promise<void> {
	const { evaluationId, error, processedAnswers, totalAnswers } = event.data;
	console.error(`  ✗ Evaluation failed: ${evaluationId} (${processedAnswers}/${totalAnswers}): ${error}`);
}
