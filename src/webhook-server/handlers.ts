import * as db from '../storage/db.js';
import { countTotalCodes } from '../utils/code-frame.js';

export async function handleWebhookEvent(event: any): Promise<void> {
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
			console.log(`  ℹ Unhandled event type: ${event.event}`);
	}
}

async function handleCodeFrameCreated(event: any): Promise<void> {
	const { questionId, codeFrame, tierCount } = event.data;

	console.log('  ✓ Code frame created successfully');
	console.log(`    Question: ${questionId}`);
	console.log(`    Tiers: ${tierCount}`);
	console.log(`    Total codes: ${countTotalCodes(codeFrame)}`);

	await db.updateQuestion(questionId, { codeFrameReady: true, codeFrame } as any);
	await db.saveCodeFrame({
		questionId,
		codeFrame,
		tierCount,
		totalCodes: countTotalCodes(codeFrame),
		created: event.timestamp
	});
}

async function handleCodeFrameFailed(event: any): Promise<void> {
	const { questionId, error } = event.data;
	console.error(`  ✗ Code frame creation failed for ${questionId}: ${error}`);
	await db.updateQuestion(questionId, { codeFrameReady: false, codeFrameError: error } as any);
}

async function handleEvaluationStarted(event: any): Promise<void> {
	const { evaluationId, totalAnswers, estimatedDuration } = event.data;

	console.log(`  ✓ Evaluation started: ${evaluationId} (${totalAnswers} answers)`);
	if (estimatedDuration) console.log(`    Estimated: ${estimatedDuration}`);

	await db.updateEvaluation(evaluationId, { status: 'started', totalAnswers, startedAt: event.timestamp } as any);
}

async function handleEvaluationProgress(event: any): Promise<void> {
	const { evaluationId, processedAnswers, totalAnswers, progress } = event.data;
	const pct = progress || 0;
	const filled = Math.round((pct / 100) * 50);
	const bar = `[${'='.repeat(filled)}${' '.repeat(50 - filled)}]`;
	console.log(`  📊 Progress: ${bar} ${pct}% (${processedAnswers}/${totalAnswers})`);

	await db.updateEvaluation(evaluationId, { processedAnswers, progress: pct } as any);
}

async function handleEvaluationCompleted(event: any): Promise<void> {
	const { evaluationId, totalAnswers, processedAnswers } = event.data;
	console.log(`  ✓ Evaluation completed: ${processedAnswers}/${totalAnswers} answers`);

	await db.updateEvaluation(evaluationId, {
		status: 'completed',
		completed: true,
		processedAnswers,
		completedAt: event.timestamp
	} as any);
}

async function handleEvaluationFailed(event: any): Promise<void> {
	const { evaluationId, error, processedAnswers, totalAnswers } = event.data;
	console.error(`  ✗ Evaluation failed: ${evaluationId} (${processedAnswers}/${totalAnswers}): ${error}`);

	await db.updateEvaluation(evaluationId, {
		status: 'failed',
		completed: false,
		processedAnswers,
		error,
		failedAt: event.timestamp
	} as any);
}
