import * as db from "../storage/db.js";
import { SurvAIClient } from "../api/client.js";
import type { Evaluation, Question } from "../api/client.js";
import { CONFIG } from "../config.js";
export async function waitForWebhook(
  eventType: string,
  timeoutMs: number = 600_000,
) {
  const startTime = Date.now();
  const pollInterval = 1_000;

  console.log(
    `  Waiting for webhook: ${eventType} (timeout: ${timeoutMs / 1_000}s)`,
  );

  while (true) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for webhook event: ${eventType}`);
    }

    const event = await db.getLatestWebhookEvent(eventType);
    if (event?.receivedAt && new Date(event.receivedAt).getTime() > startTime) {
      console.log(`  ✓ Webhook received: ${eventType}`);
      return event;
    }

    await sleep(pollInterval);
  }
}

export async function pollForEvaluation(
  client: SurvAIClient,
  surveyId: string,
  questionId: string,
  evaluationId: string,
): Promise<Evaluation> {
  const maxAttempts = CONFIG.polling.maxAttempts;
  const intervalMs = CONFIG.polling.intervalMs;

  console.log(
    `  Polling for evaluation completion (checking every ${intervalMs / 1_000}s)`,
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await client.getEvaluation(
        surveyId,
        questionId,
        evaluationId,
        true,
      );
      const evaluation = response.evaluation;

      if (evaluation.is_completed) {
        console.log("  ✓ Evaluation completed!");
        return evaluation;
      }

      if (
        evaluation.processedAnswers !== undefined &&
        evaluation.totalAnswers !== undefined
      ) {
        const progress = Math.round(
          (evaluation.processedAnswers / evaluation.totalAnswers) * 100,
        );
        const filled = Math.round((progress / 100) * 30);
        console.log(
          `  [${"=".repeat(filled)}${" ".repeat(30 - filled)}] ${progress}% (${evaluation.processedAnswers}/${evaluation.totalAnswers})`,
        );
      } else {
        console.log(
          `  Attempt ${attempt}/${maxAttempts} - Still processing...`,
        );
      }

      await sleep(intervalMs);
    } catch (error) {
      console.error(`  Error checking evaluation status: ${error}`);
      await sleep(intervalMs);
    }
  }

  throw new Error(
    `Evaluation did not complete within ${(maxAttempts * intervalMs) / 1_000}s`,
  );
}

export async function pollForCodeFrame(
  client: SurvAIClient,
  surveyId: string,
  questionId: string,
): Promise<Question> {
  const maxAttempts = CONFIG.polling.maxAttempts;
  const intervalMs = CONFIG.polling.intervalMs;

  console.log(
    `  Polling for code frame creation (checking every ${intervalMs / 1_000}s)`,
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await client.getQuestion(surveyId, questionId);
      const question = response.question;

      if (question.code_frame && question.code_frame.length > 0) {
        console.log("  ✓ Code frame created!");
        return question;
      }

      console.log(
        `  Attempt ${attempt}/${maxAttempts} - Still generating code frame...`,
      );
      await sleep(intervalMs);
    } catch (error) {
      console.error(`  Error checking code frame status: ${error}`);
      await sleep(intervalMs);
    }
  }

  throw new Error(
    `Code frame did not complete within ${(maxAttempts * intervalMs) / 1_000}s`,
  );
}

export async function waitFor(
  condition: () => Promise<boolean>,
  timeoutMs: number = 600000,
  intervalMs: number = 5_000,
  description: string = "condition",
): Promise<void> {
  const startTime = Date.now();

  console.log(`  Waiting for ${description} (timeout: ${timeoutMs / 1_000}s)`);

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

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1_000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
