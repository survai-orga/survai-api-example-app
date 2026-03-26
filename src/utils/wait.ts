import * as db from '../storage/db.js';
import { SurvAIClient } from '../api/client.js';
import { CONFIG } from '../config.js';

/**
 * Wait for a specific webhook event with timeout
 * @param eventType The event type to wait for (e.g., 'code_frame.created')
 * @param timeoutMs Maximum time to wait in milliseconds
 * @returns The webhook event data
 */
export async function waitForWebhook(
  eventType: string,
  timeoutMs: number = 600000 // 10 minutes default
): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 1000; // Check every second

  console.log(`  Waiting for webhook: ${eventType} (timeout: ${timeoutMs / 1000}s)`);

  while (true) {
    // Check if timeout exceeded
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for webhook event: ${eventType}`);
    }

    // Check for event in database
    const event = await db.getLatestWebhookEvent(eventType);
    if (event?.receivedAt && new Date(event.receivedAt).getTime() > startTime) {
      console.log(`  ✓ Webhook received: ${eventType}`);
      return event;
    }

    // Wait before checking again
    await sleep(pollInterval);
  }
}

/**
 * Wait for evaluation to complete by polling the API
 * Use this as a fallback when webhooks aren't available
 * @param client SurvAI API client
 * @param surveyId Survey ID
 * @param questionId Question ID
 * @param evaluationId Evaluation ID
 * @returns The completed evaluation
 */
export async function pollForEvaluation(
  client: SurvAIClient,
  surveyId: string,
  questionId: string,
  evaluationId: string
): Promise<any> {
  const maxAttempts = CONFIG.polling.maxAttempts;
  const intervalMs = CONFIG.polling.intervalMs;

  console.log(`  Polling for evaluation completion (checking every ${intervalMs / 1000}s)`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Get evaluation status (without answers to reduce payload size)
      const response = await client.getEvaluation(
        surveyId,
        questionId,
        evaluationId,
        true // exclude answers
      );

      const evaluation = response.evaluation;

      // Check if completed
      if (evaluation.is_completed) {
        console.log('  ✓ Evaluation completed!');
        return evaluation;
      }

      // Log progress if available
      if (evaluation.processedAnswers !== undefined && evaluation.totalAnswers !== undefined) {
        const progress = Math.round((evaluation.processedAnswers / evaluation.totalAnswers) * 100);
        const progressBar = createProgressBar(progress, 30);
        console.log(`  ${progressBar} ${progress}% (${evaluation.processedAnswers}/${evaluation.totalAnswers})`);
      } else {
        console.log(`  Attempt ${attempt}/${maxAttempts} - Still processing...`);
      }

      // Wait before next attempt
      await sleep(intervalMs);
    } catch (error) {
      console.error(`  Error checking evaluation status: ${error}`);
      // Continue polling even if there's an error
      await sleep(intervalMs);
    }
  }

  throw new Error(`Evaluation did not complete within ${maxAttempts * intervalMs / 1000}s`);
}

/**
 * Wait for code frame creation to complete by polling the API
 * @param client SurvAI API client
 * @param surveyId Survey ID
 * @param questionId Question ID
 * @returns The question with code frame
 */
export async function pollForCodeFrame(
  client: SurvAIClient,
  surveyId: string,
  questionId: string
): Promise<any> {
  const maxAttempts = CONFIG.polling.maxAttempts;
  const intervalMs = CONFIG.polling.intervalMs;

  console.log(`  Polling for code frame creation (checking every ${intervalMs / 1000}s)`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await client.getQuestion(surveyId, questionId);
      const question = response.question;

      // Check if code frame exists
      if (question.code_frame && question.code_frame.length > 0) {
        console.log('  ✓ Code frame created!');
        return question;
      }

      console.log(`  Attempt ${attempt}/${maxAttempts} - Still generating code frame...`);
      await sleep(intervalMs);
    } catch (error) {
      console.error(`  Error checking code frame status: ${error}`);
      await sleep(intervalMs);
    }
  }

  throw new Error(`Code frame did not complete within ${maxAttempts * intervalMs / 1000}s`);
}

/**
 * Wait for a condition to be true with polling
 * @param condition Function that returns true when condition is met
 * @param timeoutMs Maximum time to wait
 * @param intervalMs Polling interval
 * @param description Description for logging
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeoutMs: number = 600000,
  intervalMs: number = 5000,
  description: string = 'condition'
): Promise<void> {
  const startTime = Date.now();

  console.log(`  Waiting for ${description} (timeout: ${timeoutMs / 1000}s)`);

  while (true) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for ${description}`);
    }

    if (await condition()) {
      console.log(`  ✓ ${description} met`);
      return;
    }

    await sleep(intervalMs);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create ASCII progress bar
 */
function createProgressBar(progress: number, width: number = 50): string {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return `[${'='.repeat(filled)}${' '.repeat(empty)}]`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
