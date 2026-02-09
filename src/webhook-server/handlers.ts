import * as db from '../storage/db.js';

/**
 * Handle incoming webhook events from SurvAI
 */
export async function handleWebhookEvent(event: any): Promise<void> {
  // Store event for later inspection
  await db.saveWebhookEvent(event);

  // Handle based on event type
  switch (event.event) {
    case 'code_frame.created':
      await handleCodeFrameCreated(event);
      break;

    case 'code_frame.failed':
      await handleCodeFrameFailed(event);
      break;

    case 'evaluation.started':
      await handleEvaluationStarted(event);
      break;

    case 'evaluation.progress':
      await handleEvaluationProgress(event);
      break;

    case 'evaluation.completed':
      await handleEvaluationCompleted(event);
      break;

    case 'evaluation.failed':
      await handleEvaluationFailed(event);
      break;

    default:
      console.log(`  ℹ Unhandled event type: ${event.event}`);
  }
}

/**
 * Handle code_frame.created event
 */
async function handleCodeFrameCreated(event: any): Promise<void> {
  const { questionId, codeFrame, tierCount } = event.data;

  console.log('  ✓ Code frame created successfully');
  console.log(`    Question: ${questionId}`);
  console.log(`    Tiers: ${tierCount}`);
  console.log(`    Total codes: ${countTotalCodes(codeFrame)}`);

  // Update question with code frame
  await db.updateQuestion(questionId, {
    codeFrameReady: true,
    codeFrame: codeFrame
  });

  // Save code frame separately
  await db.saveCodeFrame({
    questionId,
    codeFrame,
    tierCount,
    totalCodes: countTotalCodes(codeFrame),
    created: event.timestamp
  });
}

/**
 * Handle code_frame.failed event
 */
async function handleCodeFrameFailed(event: any): Promise<void> {
  const { questionId, error } = event.data;

  console.error('  ✗ Code frame creation failed');
  console.error(`    Question: ${questionId}`);
  console.error(`    Error: ${error}`);

  await db.updateQuestion(questionId, {
    codeFrameReady: false,
    codeFrameError: error
  });
}

/**
 * Handle evaluation.started event
 */
async function handleEvaluationStarted(event: any): Promise<void> {
  const { evaluationId, totalAnswers, estimatedDuration } = event.data;

  console.log('  ✓ Evaluation started');
  console.log(`    Evaluation: ${evaluationId}`);
  console.log(`    Total answers: ${totalAnswers}`);
  if (estimatedDuration) {
    console.log(`    Estimated duration: ${estimatedDuration}`);
  }

  await db.updateEvaluation(evaluationId, {
    status: 'started',
    totalAnswers,
    startedAt: event.timestamp
  });
}

/**
 * Handle evaluation.progress event
 */
async function handleEvaluationProgress(event: any): Promise<void> {
  const { evaluationId, processedAnswers, totalAnswers, progress } = event.data;

  // Progress bar
  const progressBar = createProgressBar(progress || 0, 50);
  console.log(`  📊 Progress: ${progressBar} ${progress}% (${processedAnswers}/${totalAnswers})`);

  await db.updateEvaluation(evaluationId, {
    processedAnswers,
    progress: progress || 0
  });
}

/**
 * Handle evaluation.completed event
 */
async function handleEvaluationCompleted(event: any): Promise<void> {
  const { evaluationId, totalAnswers, processedAnswers } = event.data;

  console.log('  ✓ Evaluation completed successfully');
  console.log(`    Evaluation: ${evaluationId}`);
  console.log(`    Processed: ${processedAnswers}/${totalAnswers} answers`);

  await db.updateEvaluation(evaluationId, {
    status: 'completed',
    completed: true,
    processedAnswers,
    completedAt: event.timestamp
  });
}

/**
 * Handle evaluation.failed event
 */
async function handleEvaluationFailed(event: any): Promise<void> {
  const { evaluationId, error, processedAnswers, totalAnswers } = event.data;

  console.error('  ✗ Evaluation failed');
  console.error(`    Evaluation: ${evaluationId}`);
  console.error(`    Error: ${error}`);
  console.error(`    Progress: ${processedAnswers}/${totalAnswers} answers`);

  await db.updateEvaluation(evaluationId, {
    status: 'failed',
    completed: false,
    processedAnswers,
    error,
    failedAt: event.timestamp
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Count total codes in hierarchical code frame
 */
function countTotalCodes(codeFrame: any[]): number {
  if (!codeFrame) return 0;

  let count = 0;
  for (const node of codeFrame) {
    count++; // Count this node
    if (node.children && node.children.length > 0) {
      count += countTotalCodes(node.children); // Recursively count children
    }
  }
  return count;
}

/**
 * Create ASCII progress bar
 */
function createProgressBar(progress: number, width: number = 50): string {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return `[${'='.repeat(filled)}${' '.repeat(empty)}]`;
}
