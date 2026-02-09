import { SurvAIClient } from './api/client.js';
import { startWebhookServer } from './webhook-server/server.js';
import * as db from './storage/db.js';
import { sampleAnswers } from './examples/sample-data.js';
import { waitForWebhook, formatDuration } from './utils/wait.js';
import { CONFIG, validateConfig } from './config.js';
import { exportToCSV, generateReport } from './utils/export.js';

/**
 * Main orchestration script demonstrating complete SurvAI API workflow
 */
async function main() {
  const startTime = Date.now();

  console.log('='.repeat(70));
  console.log('SurvAI API Example Application');
  console.log('Demonstrating Complete Survey Evaluation Workflow');
  console.log('='.repeat(70));
  console.log();

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
    console.log(`  URL: ${webhookUrl}`);

    // Try to clean up old webhooks with the same URL to avoid signature conflicts
    // This is optional - if it fails, we'll just create a new webhook anyway
    try {
      console.log('  Cleaning up old webhooks...');
      const existingWebhooks = await client.listWebhooks();
      const oldWebhooks = existingWebhooks.webhooks.filter(w => w.url === webhookUrl);

      if (oldWebhooks.length > 0) {
        console.log(`  Found ${oldWebhooks.length} old webhook(s) to remove`);
        for (const oldWebhook of oldWebhooks) {
          try {
            await client.deleteWebhook(oldWebhook.id);
            console.log(`  ✓ Deleted old webhook: ${oldWebhook.id}`);
          } catch (deleteError) {
            console.log(`  ⚠ Failed to delete webhook ${oldWebhook.id}`);
          }
        }
      } else {
        console.log('  No old webhooks to clean up');
      }
    } catch (listError) {
      console.log('  ⚠ Could not list existing webhooks (continuing anyway)');
      console.log('  Note: You may see signature validation warnings from old webhooks');
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
    console.log(`  Secret: ${webhook.secret.substring(0, 15)}...`);

    // Save webhook configuration
    await db.saveWebhook(webhook);
    await db.saveConfig({
      webhookId: webhook.id,
      webhookSecret: webhook.secret,
      webhookUrl: webhookUrl
    });

    // Update CONFIG with webhook secret for signature verification
    (CONFIG.webhook as any).secret = webhook.secret;
    console.log();

    // Small delay to ensure webhook server is fully ready to receive events
    // This is especially important in instant mock mode where jobs complete in 0ms
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ========================================================================
    // STEP 5: Import Survey with Question and Answers
    // ========================================================================
    console.log('Step 5: Importing survey with question and answers...');
    console.log(`  Total answers: ${sampleAnswers.length}`);

    const importResponse = await client.importSurvey({
      name: 'Customer Feedback Survey 2025',
      comment: 'Example survey demonstrating SurvAI API - Created by example application',
      questions: [{
        question_text: 'What improvements would you like to see in our product?',
        question_name: 'product_improvements',
        additional_instruction: 'Focus on features, usability, and performance aspects',
        answers: sampleAnswers
      }]
    });

    const surveyId = importResponse.surveyId;
    console.log(`✓ Survey imported: ${surveyId}`);
    console.log(`  Name: Customer Feedback Survey 2025`);
    console.log(`  Answers: ${sampleAnswers.length} imported`);
    console.log();

    // Get the survey and question details
    const surveyResponse = await client.getSurvey(surveyId);
    const survey = surveyResponse.survey;
    await db.saveSurvey(survey);

    // Get the first (and only) question
    const questionsResponse = await client.getQuestions(surveyId);
    const question = questionsResponse.questions[0];
    await db.saveQuestion(question);
    await db.saveAnswers(sampleAnswers);

    // ========================================================================
    // STEP 6: Generate Code Frame (GPT-5)
    // ========================================================================
    console.log('Step 6: Generating code frame with GPT-5...');
    console.log('  This will create a hierarchical categorization structure');

    const codeFrameResponse = await client.createCodeFrame(surveyId, question.id, {
      additionalInstruction: 'Create a 2-tier hierarchical structure with 5-8 main categories',
      tierCount: 2
    });

    console.log(`✓ Code frame job started: ${codeFrameResponse.jobId}`);
    console.log('  Waiting for webhook notification...');

    // Wait for code frame creation webhook
    const codeFrameEvent = await waitForWebhook('code_frame.created', 300000); // 5 minutes
    console.log('✓ Code frame created successfully!');
    displayCodeFrame(codeFrameEvent.data.codeFrame);
    console.log();

    // ========================================================================
    // STEP 7: Run Evaluation (GPT-4o)
    // ========================================================================
    console.log('Step 7: Starting answer evaluation with GPT-4o...');
    console.log('  This will categorize all answers using the generated code frame');

    const evaluationResponse = await client.createEvaluation(surveyId, question.id, {
      evaluationName: 'Initial Evaluation',
      additionalInstructionEvaluation: 'Be precise and use the most specific codes available'
    });

    const evaluationId = evaluationResponse.evaluationId;
    console.log(`✓ Evaluation started: ${evaluationId}`);
    console.log('  Monitoring progress via webhooks...');
    console.log();

    // Wait for evaluation completion webhook
    const evalCompleteEvent = await waitForWebhook('evaluation.completed', 600000); // 10 minutes

    console.log();
    console.log('✓ Evaluation completed successfully!');
    console.log(`  Processed: ${evalCompleteEvent.data.processedAnswers}/${evalCompleteEvent.data.totalAnswers} answers`);
    console.log();

    // ========================================================================
    // STEP 8: Retrieve & Analyze Results
    // ========================================================================
    console.log('Step 8: Retrieving evaluation results...');

    const resultsResponse = await client.getEvaluation(
      surveyId,
      question.id,
      evaluationId,
      false // excludeAnswers = false means INCLUDE answers
    );

    const evaluation = resultsResponse.evaluation;
    const evaluatedAnswers = resultsResponse.evaluatedAnswers || [];

    await db.saveEvaluation(evaluation);
    await db.saveEvaluatedAnswers(evaluatedAnswers);

    console.log(`✓ Results retrieved: ${evaluatedAnswers.length} evaluated answers`);
    console.log();

    // Analyze and display results
    analyzeResults(evaluatedAnswers, codeFrameEvent.data.codeFrame);
    console.log();

    // ========================================================================
    // STEP 9: Export Data
    // ========================================================================
    console.log('Step 9: Exporting results...');

    // Export to CSV
    const csvPath = await exportToCSV(evaluatedAnswers, {
      surveyName: 'Customer Feedback Survey 2025',
      questionText: question.question_text
    });
    console.log(`✓ CSV exported: ${csvPath}`);

    // Generate JSON report
    const reportPath = await generateReport({
      survey: { id: surveyId, name: 'Customer Feedback Survey 2025' },
      question,
      evaluation,
      codeFrame: codeFrameEvent.data.codeFrame,
      evaluatedAnswers
    });
    console.log(`✓ Report generated: ${reportPath}`);
    console.log();

    // ========================================================================
    // COMPLETION
    // ========================================================================
    const duration = Date.now() - startTime;

    console.log('='.repeat(70));
    console.log('✓ Complete workflow finished successfully!');
    console.log('='.repeat(70));
    console.log();
    console.log('Summary:');
    console.log(`  Survey: Customer Feedback Survey 2025 (${surveyId})`);
    console.log(`  Question: ${question.question_name} (${question.id})`);
    console.log(`  Answers: ${sampleAnswers.length} uploaded`);
    console.log(`  Code Frame: ${countTotalCodes(codeFrameEvent.data.codeFrame)} total codes`);
    console.log(`  Evaluation: ${evaluatedAnswers.length} answers coded`);
    console.log(`  Duration: ${formatDuration(duration)}`);
    console.log();
    console.log('Data saved in:');
    console.log(`  - ${CONFIG.storage.dataDir}/`);
    console.log();
    console.log('Next steps:');
    console.log('  1. Review exported CSV file for analysis');
    console.log('  2. Check JSON report for detailed statistics');
    console.log('  3. Explore webhook events in data/webhook-events.json');
    console.log('  4. Optionally clean up resources (survey, webhook)');
    console.log();

    // Keep webhook server running for a bit to catch any late webhooks
    console.log('Keeping webhook server running for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('✓ Example application completed');
    process.exit(0);

  } catch (error) {
    console.error();
    console.error('='.repeat(70));
    console.error('✗ Error occurred during workflow');
    console.error('='.repeat(70));
    console.error(error);
    console.error();
    process.exit(1);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Display code frame in hierarchical format
 */
function displayCodeFrame(codeFrame: any[], indent: string = ''): void {
  if (!codeFrame || codeFrame.length === 0) return;

  for (const node of codeFrame) {
    console.log(`${indent}${node.id}. ${node.name}`);
    if (node.children && node.children.length > 0) {
      displayCodeFrame(node.children, indent + '   ');
    }
  }
}

/**
 * Count total codes in hierarchical code frame
 */
function countTotalCodes(codeFrame: any[]): number {
  if (!codeFrame) return 0;

  let count = 0;
  for (const node of codeFrame) {
    count++;
    if (node.children && node.children.length > 0) {
      count += countTotalCodes(node.children);
    }
  }
  return count;
}

/**
 * Analyze and display evaluation results
 */
function analyzeResults(evaluatedAnswers: any[], _codeFrame: any[]): void {
  console.log('Analysis Results:');
  console.log('-'.repeat(70));

  // Calculate statistics
  const totalAnswers = evaluatedAnswers.length;
  const answersWithCodings = evaluatedAnswers.filter(a => a.codings && a.codings.length > 0);
  const totalCodings = evaluatedAnswers.reduce((sum, a) => sum + (a.codings?.length || 0), 0);
  const avgCodingsPerAnswer = totalCodings / totalAnswers;

  console.log(`Total Answers: ${totalAnswers}`);
  console.log(`Successfully Coded: ${answersWithCodings.length} (${Math.round(answersWithCodings.length / totalAnswers * 100)}%)`);
  console.log(`Total Codings: ${totalCodings}`);
  console.log(`Average Codings per Answer: ${avgCodingsPerAnswer.toFixed(2)}`);
  console.log();

  // Count codes by category
  const codeCounts: Record<string, number> = {};
  for (const answer of evaluatedAnswers) {
    if (!answer.codings) continue;
    for (const coding of answer.codings) {
      const path = coding.code_path;
      codeCounts[path] = (codeCounts[path] || 0) + 1;
    }
  }

  // Sort by frequency
  const sortedCodes = Object.entries(codeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10); // Top 10

  console.log('Top Categories:');
  for (const [path, count] of sortedCodes) {
    const percentage = Math.round((count / totalAnswers) * 100);
    console.log(`  ${count.toString().padStart(3)} (${percentage}%) - ${path}`);
  }
  console.log();

  // Show sample coded answers
  console.log('Sample Coded Answers:');
  const samples = evaluatedAnswers.filter(a => a.codings && a.codings.length > 0).slice(0, 3);
  for (let i = 0; i < samples.length; i++) {
    const answer = samples[i];
    console.log(`\n  Answer #${i + 1}: "${answer.answer_text.substring(0, 60)}${answer.answer_text.length > 60 ? '...' : ''}"`);
    for (const coding of answer.codings) {
      console.log(`  → ${coding.code_path}`);
      if (coding.textbits && coding.textbits.length > 0) {
        console.log(`    Evidence: [${coding.textbits.join(', ')}]`);
      }
    }
  }
}

// ============================================================================
// RUN MAIN
// ============================================================================

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
