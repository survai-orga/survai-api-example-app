import { SurvAIClient } from './api/client.js';
import { startWebhookServer } from './webhook-server/server.js';
import * as db from './storage/db.js';
import {
  wave1Answers,
  wave2Answers,
  wave3Answers,
  trackingSurveyQuestion,
  trackingSurveyInfo
} from './examples/tracking-survey-data.js';
import { waitForWebhook, formatDuration } from './utils/wait.js';
import { CONFIG, validateConfig } from './config.js';
import { exportToCSV } from './utils/export.js';

/**
 * Tracking Survey Example
 *
 * This example demonstrates the complete tracking survey workflow:
 * 1. Create a survey with initial answers (Wave 1)
 * 2. Generate code frame and run initial evaluation
 * 3. Add new answers (Wave 2)
 * 4. Continue evaluation to code only the new answers
 * 5. Add more answers (Wave 3)
 * 6. Continue evaluation again
 * 7. Review aggregated results
 *
 * This pattern is ideal for:
 * - Continuous feedback collection (e.g., daily/weekly surveys)
 * - Longitudinal studies with periodic data collection
 * - Live event feedback with ongoing submissions
 * - Multi-wave research projects
 */
async function main() {
  const startTime = Date.now();

  console.log('='.repeat(70));
  console.log('SurvAI Tracking Survey Example');
  console.log('Demonstrating Continuous Answer Collection Workflow');
  console.log('='.repeat(70));
  console.log();

  let surveyId: string = '';
  let questionId: string = '';
  let webhookId: string = '';
  let evaluationId: string = '';

  try {
    // ========================================================================
    // STEP 1: Configuration & Setup
    // ========================================================================
    console.log('Step 1: Validating configuration...');
    validateConfig();
    console.log();

    // ========================================================================
    // STEP 2: Start Webhook Server
    // ========================================================================
    console.log('Step 2: Starting webhook server...');
    await startWebhookServer();
    console.log();

    // ========================================================================
    // STEP 3: Initialize API Client
    // ========================================================================
    console.log('Step 3: Initializing API client...');
    const client = new SurvAIClient();
    console.log('✓ API client initialized');
    console.log(`  Base URL: ${CONFIG.api.baseUrl}`);
    console.log();

    // ========================================================================
    // STEP 4: Register Webhook
    // ========================================================================
    console.log('Step 4: Registering webhook...');
    const webhookUrl = `${CONFIG.webhook.baseUrl}${CONFIG.webhook.path}`;

    const webhookResponse = await client.createWebhook({
      url: webhookUrl,
      name: 'Tracking Survey Webhook',
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
    webhookId = webhook.id;
    console.log(`✓ Webhook registered: ${webhook.id}`);
    await db.saveWebhook(webhook);
    console.log();

    // ========================================================================
    // STEP 5: Create Survey with Wave 1 Answers
    // ========================================================================
    console.log('Step 5: Creating tracking survey with initial answers (Wave 1)...');
    console.log(`  Importing ${wave1Answers.length} initial answers`);

    const importResponse = await client.importSurvey({
      name: trackingSurveyInfo.name,
      comment: trackingSurveyInfo.comment,
      questions: [{
        ...trackingSurveyQuestion,
        answers: wave1Answers
      }]
    });

    surveyId = importResponse.surveyId;
    console.log(`✓ Survey created: ${surveyId}`);

    // Get the question ID from the created survey
    const questionsResponse = await client.getQuestions(surveyId);
    questionId = questionsResponse.questions[0].id;

    console.log(`  Question ID: ${questionId}`);
    console.log(`  Initial answers: ${wave1Answers.length}`);
    console.log();

    // ========================================================================
    // STEP 6: Generate Code Frame
    // ========================================================================
    console.log('Step 6: Generating AI code frame...');

    const codeFrameJob = await client.createCodeFrame(surveyId, questionId, {
      additionalInstruction: 'Create categories for: sentiment (positive/negative/neutral), feature requests, bug reports, performance issues, and UX feedback',
      tierCount: 2
    });

    console.log(`  Job queued: ${codeFrameJob.jobId}`);
    console.log('  Waiting for code frame generation...');

    const codeFrameEvent = await waitForWebhook('code_frame.created', 180000);

    if (!codeFrameEvent) {
      throw new Error('Code frame generation timed out');
    }

    console.log(`✓ Code frame created with ${countTotalCodes(codeFrameEvent.data.codeFrame)} categories`);
    displayCodeFrameSummary(codeFrameEvent.data.codeFrame);
    console.log();

    // ========================================================================
    // STEP 7: Run Initial Evaluation (Wave 1)
    // ========================================================================
    console.log('Step 7: Running initial evaluation on Wave 1 answers...');

    const evalResponse = await client.createEvaluation(surveyId, questionId, {
      evaluationName: 'Tracking Evaluation - Initial',
      additionalInstructionEvaluation: 'Assign multiple codes if applicable. Focus on actionable insights.'
    });

    evaluationId = evalResponse.evaluationId;
    console.log(`  Evaluation ID: ${evaluationId}`);
    console.log('  Waiting for evaluation to complete...');

    const evalCompleteEvent = await waitForWebhook('evaluation.completed', 300000);

    if (!evalCompleteEvent) {
      throw new Error('Evaluation timed out');
    }

    console.log(`✓ Wave 1 evaluation completed`);
    console.log(`  Answers evaluated: ${wave1Answers.length}`);
    console.log();

    // ========================================================================
    // STEP 8: Verify Initial Results
    // ========================================================================
    console.log('Step 8: Fetching Wave 1 results...');

    const wave1Results = await client.getEvaluation(surveyId, questionId, evaluationId);
    const wave1EvaluatedCount = wave1Results.evaluatedAnswers?.length || 0;

    console.log(`✓ Wave 1 Results:`);
    console.log(`  Evaluated answers: ${wave1EvaluatedCount}`);
    displayCodingSummary(wave1Results.evaluatedAnswers || []);
    console.log();

    // ========================================================================
    // STEP 9: Add Wave 2 Answers (Simulating New Data Arriving)
    // ========================================================================
    console.log('Step 9: Adding Wave 2 answers (simulating new data arrival)...');
    console.log(`  Adding ${wave2Answers.length} new answers`);

    // In a real scenario, this might happen days/weeks later
    const wave2Response = await client.createAnswers(surveyId, questionId, wave2Answers);

    console.log(`✓ Wave 2 answers added: ${wave2Response.count || wave2Answers.length}`);

    // Verify total answers
    const allAnswers = await client.listAnswers(surveyId, questionId);
    console.log(`  Total answers now: ${allAnswers.answers.length}`);
    console.log();

    // ========================================================================
    // STEP 10: Continue Evaluation for Wave 2
    // ========================================================================
    console.log('Step 10: Continuing evaluation to process Wave 2 answers...');

    const continueResponse = await client.continueEvaluations(
      surveyId,
      questionId,
      [evaluationId]
    );

    console.log(`✓ Continue evaluation started:`);
    console.log(`  New jobs queued: ${continueResponse.summary.totalJobsQueued}`);
    console.log(`  Is tracking survey: ${continueResponse.results[0].isTrackingSurvey}`);

    if (continueResponse.summary.totalJobsQueued > 0) {
      console.log('  Waiting for Wave 2 evaluation to complete...');

      const wave2EvalComplete = await waitForWebhook('evaluation.completed', 300000);

      if (!wave2EvalComplete) {
        throw new Error('Wave 2 evaluation timed out');
      }
    }

    console.log(`✓ Wave 2 evaluation completed`);
    console.log();

    // ========================================================================
    // STEP 11: Add Wave 3 Answers
    // ========================================================================
    console.log('Step 11: Adding Wave 3 answers...');
    console.log(`  Adding ${wave3Answers.length} new answers`);

    await client.createAnswers(surveyId, questionId, wave3Answers);
    console.log(`✓ Wave 3 answers added`);

    // Get updated answer count
    const finalAnswers = await client.listAnswers(surveyId, questionId);
    console.log(`  Total answers now: ${finalAnswers.answers.length}`);
    console.log();

    // ========================================================================
    // STEP 12: Continue Evaluation for Wave 3
    // ========================================================================
    console.log('Step 12: Continuing evaluation to process Wave 3 answers...');

    const continue2Response = await client.continueEvaluations(
      surveyId,
      questionId,
      [evaluationId]
    );

    console.log(`✓ Continue evaluation started:`);
    console.log(`  New jobs queued: ${continue2Response.summary.totalJobsQueued}`);

    if (continue2Response.summary.totalJobsQueued > 0) {
      console.log('  Waiting for Wave 3 evaluation to complete...');

      const wave3EvalComplete = await waitForWebhook('evaluation.completed', 300000);

      if (!wave3EvalComplete) {
        throw new Error('Wave 3 evaluation timed out');
      }
    }

    console.log(`✓ Wave 3 evaluation completed`);
    console.log();

    // ========================================================================
    // STEP 13: Final Results
    // ========================================================================
    console.log('Step 13: Fetching final aggregated results...');

    const finalResults = await client.getEvaluation(surveyId, questionId, evaluationId);
    const finalEvaluatedCount = finalResults.evaluatedAnswers?.length || 0;

    console.log(`✓ Final Results:`);
    console.log(`  Total evaluated answers: ${finalEvaluatedCount}`);
    console.log(`  Expected: ${wave1Answers.length + wave2Answers.length + wave3Answers.length}`);
    console.log();

    displayCodingSummary(finalResults.evaluatedAnswers || []);
    console.log();

    // ========================================================================
    // STEP 14: Export Results
    // ========================================================================
    console.log('Step 14: Exporting tracking survey results...');

    const csvPath = await exportToCSV(finalResults.evaluatedAnswers || [], {
      surveyName: trackingSurveyInfo.name,
      questionText: trackingSurveyQuestion.question_text
    });
    console.log(`✓ CSV exported: ${csvPath}`);
    console.log();

    // ========================================================================
    // STEP 15: List Evaluations (Demonstration)
    // ========================================================================
    console.log('Step 15: Listing all evaluations for this question...');

    const evaluationsList = await client.listEvaluations(surveyId, questionId);
    console.log(`✓ Found ${evaluationsList.evaluations.length} evaluation(s)`);

    for (const evaluation of evaluationsList.evaluations) {
      console.log(`  - ${evaluation.name}: ${evaluation.processedAnswers}/${evaluation.totalAnswers} answers (${evaluation.is_completed ? 'completed' : 'in progress'})`);
    }
    console.log();

    // ========================================================================
    // COMPLETION
    // ========================================================================
    const duration = Date.now() - startTime;

    console.log('='.repeat(70));
    console.log('✓ Tracking Survey Example Completed Successfully!');
    console.log('='.repeat(70));
    console.log();
    console.log('Summary:');
    console.log(`  Survey: ${trackingSurveyInfo.name}`);
    console.log(`  Total Waves: 3`);
    console.log(`  Wave 1 answers: ${wave1Answers.length}`);
    console.log(`  Wave 2 answers: ${wave2Answers.length}`);
    console.log(`  Wave 3 answers: ${wave3Answers.length}`);
    console.log(`  Total answers processed: ${finalEvaluatedCount}`);
    console.log(`  Duration: ${formatDuration(duration)}`);
    console.log();
    console.log('Key Takeaways:');
    console.log('  • Use createAnswers() to add new answers to existing questions');
    console.log('  • Use continueEvaluations() to process only new answers');
    console.log('  • Evaluation maintains same code frame for consistency');
    console.log('  • Track progress with listEvaluations() and getEvaluation()');
    console.log();

    // Cleanup info
    console.log('Resources created:');
    console.log(`  Survey ID: ${surveyId}`);
    console.log(`  Question ID: ${questionId}`);
    console.log(`  Evaluation ID: ${evaluationId}`);
    console.log(`  Webhook ID: ${webhookId}`);
    console.log();
    console.log('To clean up, run:');
    console.log(`  await client.deleteSurvey('${surveyId}')`);
    console.log(`  await client.deleteWebhook('${webhookId}')`);
    console.log();

    // Keep webhook server running briefly
    console.log('Keeping webhook server running for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('✓ Tracking survey example completed');
    process.exit(0);

  } catch (error) {
    console.error();
    console.error('='.repeat(70));
    console.error('✗ Error occurred during tracking survey workflow');
    console.error('='.repeat(70));
    console.error(error);
    console.error();
    process.exit(1);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function countTotalCodes(codeFrame: any[]): number {
  if (!codeFrame) return 0;
  let count = 0;
  for (const node of codeFrame) {
    count++;
    if (node.children?.length > 0) {
      count += countTotalCodes(node.children);
    }
  }
  return count;
}

function displayCodeFrameSummary(codeFrame: any[]): void {
  console.log('  Code Frame Structure:');
  for (const node of codeFrame || []) {
    const childCount = node.children?.length || 0;
    console.log(`    • ${node.name}${childCount > 0 ? ` (${childCount} subcategories)` : ''}`);
  }
}

function displayCodingSummary(evaluatedAnswers: any[]): void {
  if (!evaluatedAnswers || evaluatedAnswers.length === 0) {
    console.log('  No evaluated answers to summarize');
    return;
  }

  // Count codes by category
  const codeCounts: Record<string, number> = {};
  for (const answer of evaluatedAnswers) {
    if (!answer.codings) continue;
    for (const coding of answer.codings) {
      const path = coding.code_path || 'Uncoded';
      const topLevel = path.split(' > ')[0];
      codeCounts[topLevel] = (codeCounts[topLevel] || 0) + 1;
    }
  }

  // Display summary
  const sortedCodes = Object.entries(codeCounts)
    .sort(([, a], [, b]) => b - a);

  console.log('  Coding Summary (by top-level category):');
  for (const [category, count] of sortedCodes) {
    const percentage = Math.round((count / evaluatedAnswers.length) * 100);
    console.log(`    • ${category}: ${count} (${percentage}%)`);
  }
}

// ============================================================================
// RUN MAIN
// ============================================================================

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
