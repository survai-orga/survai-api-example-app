import { SurvAIClient } from './api/client.js';
import type { EvaluatedAnswer, Evaluation, Question, Webhook } from './api/client.js';
import { startWebhookServer } from './webhook-server/server.js';
import * as db from './storage/db.js';
import { sampleAnswers } from './examples/sample-data.js';
import { waitForWebhook, formatDuration } from './utils/wait.js';
import { CONFIG, validateConfig } from './config.js';
import { exportToCSV, generateReport } from './utils/export.js';
import { displayCodeFrame } from './utils/code-frame.js';
import type { CodeFrameCreatedEvent } from './types.js';

async function main() {
	const startTime = Date.now();

	console.log('='.repeat(70));
	console.log('SurvAI API Example Application');
	console.log('='.repeat(70));
	console.log();

	try {
		console.log('Step 1: Validating configuration...');
		validateConfig();
		console.log();

		console.log('Step 2: Starting webhook server...');
		await startWebhookServer();
		console.log();

		console.log('Step 3: Initializing API client...');
		const client = new SurvAIClient();
		console.log(`✓ API client initialized (${CONFIG.api.baseUrl})`);
		console.log();

		console.log('Step 4: Registering webhook...');
		await registerWebhook(client);
		console.log();

		await new Promise((resolve) => setTimeout(resolve, 1000));

		console.log('Step 5: Importing survey...');
		const { surveyId, question } = await importSurvey(client);
		console.log();

		console.log('Step 6: Generating code frame with AI...');
		const codeFrameEvent = await generateCodeFrame(client, surveyId, question.id);
		console.log();

		console.log('Step 7: Running evaluation with AI...');
		const { evaluationId } = await runEvaluation(client, surveyId, question.id);
		console.log();

		console.log('Step 8: Retrieving results...');
		const { evaluation, evaluatedAnswers } = await retrieveResults(
			client,
			surveyId,
			question.id,
			evaluationId
		);
		analyzeResults(evaluatedAnswers);
		console.log();

		console.log('Step 9: Exporting results...');
		const codeFrame = (codeFrameEvent as CodeFrameCreatedEvent).data.codeFrame;
		await exportResults(evaluatedAnswers, question, surveyId, evaluation, codeFrame);
		console.log();

		const duration = Date.now() - startTime;
		console.log('='.repeat(70));
		console.log(`✓ Complete workflow finished in ${formatDuration(duration)}`);
		console.log('='.repeat(70));
		console.log();

		console.log('Keeping webhook server running for 10 seconds...');
		await new Promise((resolve) => setTimeout(resolve, 10000));

		process.exit(0);
	} catch (error) {
		console.error('\n✗ Error occurred during workflow');
		console.error(error);
		process.exit(1);
	}
}

async function registerWebhook(client: SurvAIClient): Promise<Webhook> {
	const webhookUrl = `${CONFIG.webhook.baseUrl}${CONFIG.webhook.path}`;
	console.log(`  URL: ${webhookUrl}`);

	try {
		const existingWebhooks = await client.listWebhooks();
		const oldWebhooks = existingWebhooks.webhooks.filter((w) => w.url === webhookUrl);

		for (const old of oldWebhooks) {
			await client.deleteWebhook(old.id).catch(() => {});
			console.log(`  ✓ Cleaned up old webhook: ${old.id}`);
		}
	} catch {
		console.log('  ⚠ Could not list existing webhooks (continuing anyway)');
	}

	const webhookResponse = await client.createWebhook({
		url: webhookUrl,
		name: 'Example App Webhook',
		events: [
			'code_frame.created',
			'code_frame.failed',
			'evaluation.started',
			'evaluation.progress',
			'evaluation.completed',
			'evaluation.failed'
		]
	});

	const webhook = webhookResponse.webhook;
	console.log(`✓ Webhook registered: ${webhook.id}`);

	await db.saveWebhook(webhook);
	await db.saveConfig({ webhookId: webhook.id, webhookSecret: webhook.secret, webhookUrl });
	(CONFIG.webhook as { secret?: string }).secret = webhook.secret;

	return webhook;
}

async function importSurvey(client: SurvAIClient): Promise<{ surveyId: string; question: Question }> {
	console.log(`  Total answers: ${sampleAnswers.length}`);

	const importResponse = await client.importSurvey({
		name: 'Customer Feedback Survey 2025',
		comment: 'Example survey demonstrating SurvAI API',
		questions: [
			{
				question_text: 'What improvements would you like to see in our product?',
				question_name: 'product_improvements',
				additional_instruction: 'Focus on features, usability, and performance aspects',
				answers: sampleAnswers
			}
		]
	});

	const surveyId = importResponse.surveyId;
	console.log(`✓ Survey imported: ${surveyId} (${sampleAnswers.length} answers)`);

	const surveyResponse = await client.getSurvey(surveyId);
	await db.saveSurvey(surveyResponse.survey);

	const questionsResponse = await client.getQuestions(surveyId);
	const question = questionsResponse.questions[0];
	await db.saveQuestion(question);
	await db.saveAnswers(sampleAnswers);

	return { surveyId, question };
}

async function generateCodeFrame(client: SurvAIClient, surveyId: string, questionId: string) {
	const codeFrameResponse = await client.createCodeFrame(surveyId, questionId, {
		additionalInstruction: 'Create a 2-tier hierarchical structure with 5-8 main categories',
		tierCount: 2
	});

	console.log(`✓ Code frame job started: ${codeFrameResponse.jobId}`);
	console.log('  Waiting for webhook notification...');

	const codeFrameEvent = await waitForWebhook('code_frame.created', 300000);
	console.log('✓ Code frame created successfully!');
	const codeFrame = (codeFrameEvent as CodeFrameCreatedEvent).data.codeFrame;
	displayCodeFrame(codeFrame);

	return codeFrameEvent;
}

async function runEvaluation(client: SurvAIClient, surveyId: string, questionId: string): Promise<{ evaluationId: string }> {
	const evaluationResponse = await client.createEvaluation(surveyId, questionId, {
		evaluationName: 'Initial Evaluation',
		additionalInstructionEvaluation: 'Be precise and use the most specific codes available'
	});

	const evaluationId = evaluationResponse.evaluationId;
	console.log(`✓ Evaluation started: ${evaluationId}`);
	console.log('  Monitoring progress via webhooks...');

	const evalCompleteEvent = await waitForWebhook('evaluation.completed', 600000);
	const { processedAnswers, totalAnswers } = evalCompleteEvent.data as { processedAnswers: number; totalAnswers: number };
	console.log(`✓ Evaluation completed: ${processedAnswers}/${totalAnswers} answers`);

	return { evaluationId };
}

async function retrieveResults(
	client: SurvAIClient,
	surveyId: string,
	questionId: string,
	evaluationId: string
) {
	const resultsResponse = await client.getEvaluation(surveyId, questionId, evaluationId, false);
	const evaluation = resultsResponse.evaluation;
	const evaluatedAnswers = resultsResponse.evaluatedAnswers || [];

	await db.saveEvaluation(evaluation);
	await db.saveEvaluatedAnswers(evaluatedAnswers);

	console.log(`✓ Results retrieved: ${evaluatedAnswers.length} evaluated answers`);
	return { evaluation, evaluatedAnswers };
}

function analyzeResults(evaluatedAnswers: EvaluatedAnswer[]): void {
	console.log('\nAnalysis Results:');
	console.log('-'.repeat(70));

	const total = evaluatedAnswers.length;
	const coded = evaluatedAnswers.filter((a) => a.codings?.length > 0);
	const totalCodings = evaluatedAnswers.reduce((sum, a) => sum + (a.codings?.length || 0), 0);

	console.log(`Total: ${total} | Coded: ${coded.length} (${Math.round((coded.length / total) * 100)}%) | Avg codings: ${(totalCodings / total).toFixed(2)}`);

	const codeCounts: Record<string, number> = {};
	for (const answer of evaluatedAnswers) {
		for (const coding of answer.codings || []) {
			codeCounts[coding.code_path] = (codeCounts[coding.code_path] || 0) + 1;
		}
	}

	const topCodes = Object.entries(codeCounts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 10);

	console.log('\nTop Categories:');
	for (const [path, count] of topCodes) {
		console.log(`  ${String(count).padStart(3)} (${Math.round((count / total) * 100)}%) - ${path}`);
	}

	console.log('\nSample Coded Answers:');
	const samples = evaluatedAnswers.filter((a) => a.codings?.length > 0).slice(0, 3);
	samples.forEach((answer, i) => {
		console.log(`\n  #${i + 1}: "${answer.answer_text.substring(0, 60)}${answer.answer_text.length > 60 ? '...' : ''}"`);
		for (const coding of answer.codings) {
			console.log(`  → ${coding.code_path}`);
			if (coding.textbits?.length > 0) console.log(`    Evidence: [${coding.textbits.join(', ')}]`);
		}
	});
}

async function exportResults(
	evaluatedAnswers: EvaluatedAnswer[],
	question: Question,
	surveyId: string,
	evaluation: Evaluation,
	codeFrame: CodeFrameCreatedEvent['data']['codeFrame']
) {
	const csvPath = await exportToCSV(evaluatedAnswers, {
		surveyName: 'Customer Feedback Survey 2025',
		questionText: question.question_text
	});
	console.log(`✓ CSV exported: ${csvPath}`);

	const reportPath = await generateReport({
		survey: { id: surveyId, name: 'Customer Feedback Survey 2025' },
		question,
		evaluation,
		codeFrame,
		evaluatedAnswers
	});
	console.log(`✓ Report generated: ${reportPath}`);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
