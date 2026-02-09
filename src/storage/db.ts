import fs from 'fs/promises';
import path from 'path';
import { CONFIG } from '../config.js';

/**
 * Simple JSON file database for storing application data
 * Each entity type is stored in its own JSON file
 */

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(CONFIG.storage.dataDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

// Generic file operations
async function readJsonFile<T>(filename: string): Promise<T> {
  const filepath = path.join(CONFIG.storage.dataDir, filename);
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // File doesn't exist, return empty structure
    return {} as T;
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  await ensureDataDir();
  const filepath = path.join(CONFIG.storage.dataDir, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================================================
// CONFIG OPERATIONS
// ============================================================================

interface ConfigData {
  apiKey?: string;
  webhookId?: string;
  webhookSecret?: string;
  webhookUrl?: string;
}

export async function saveConfig(config: ConfigData): Promise<void> {
  await writeJsonFile('config.json', config);
}

export async function getConfig(): Promise<ConfigData> {
  return readJsonFile<ConfigData>('config.json');
}

// ============================================================================
// SURVEY OPERATIONS
// ============================================================================

interface SurveysData {
  surveys: any[];
}

export async function saveSurvey(survey: any): Promise<void> {
  const data = await readJsonFile<SurveysData>('surveys.json');
  if (!data.surveys) data.surveys = [];
  data.surveys.push(survey);
  await writeJsonFile('surveys.json', data);
}

export async function getSurveys(): Promise<any[]> {
  const data = await readJsonFile<SurveysData>('surveys.json');
  return data.surveys || [];
}

export async function getSurvey(surveyId: string): Promise<any | null> {
  const surveys = await getSurveys();
  return surveys.find(s => s.id === surveyId) || null;
}

// ============================================================================
// QUESTION OPERATIONS
// ============================================================================

interface QuestionsData {
  questions: any[];
}

export async function saveQuestion(question: any): Promise<void> {
  const data = await readJsonFile<QuestionsData>('questions.json');
  if (!data.questions) data.questions = [];
  data.questions.push(question);
  await writeJsonFile('questions.json', data);
}

export async function updateQuestion(questionId: string, updates: any): Promise<void> {
  const data = await readJsonFile<QuestionsData>('questions.json');
  if (!data.questions) data.questions = [];

  const index = data.questions.findIndex(q => q.id === questionId);
  if (index !== -1) {
    data.questions[index] = { ...data.questions[index], ...updates };
    await writeJsonFile('questions.json', data);
  }
}

export async function getQuestions(): Promise<any[]> {
  const data = await readJsonFile<QuestionsData>('questions.json');
  return data.questions || [];
}

export async function getQuestion(questionId: string): Promise<any | null> {
  const questions = await getQuestions();
  return questions.find(q => q.id === questionId) || null;
}

// ============================================================================
// ANSWER OPERATIONS
// ============================================================================

interface AnswersData {
  answers: any[];
}

export async function saveAnswers(answers: any[]): Promise<void> {
  const data = await readJsonFile<AnswersData>('answers.json');
  if (!data.answers) data.answers = [];
  data.answers.push(...answers);
  await writeJsonFile('answers.json', data);
}

export async function getAnswers(): Promise<any[]> {
  const data = await readJsonFile<AnswersData>('answers.json');
  return data.answers || [];
}

// ============================================================================
// CODE FRAME OPERATIONS
// ============================================================================

interface CodeFramesData {
  codeFrames: any[];
}

export async function saveCodeFrame(codeFrame: any): Promise<void> {
  const data = await readJsonFile<CodeFramesData>('codeframes.json');
  if (!data.codeFrames) data.codeFrames = [];
  data.codeFrames.push(codeFrame);
  await writeJsonFile('codeframes.json', data);
}

export async function getCodeFrames(): Promise<any[]> {
  const data = await readJsonFile<CodeFramesData>('codeframes.json');
  return data.codeFrames || [];
}

// ============================================================================
// EVALUATION OPERATIONS
// ============================================================================

interface EvaluationsData {
  evaluations: any[];
}

export async function saveEvaluation(evaluation: any): Promise<void> {
  const data = await readJsonFile<EvaluationsData>('evaluations.json');
  if (!data.evaluations) data.evaluations = [];

  // Update if exists, otherwise add
  const index = data.evaluations.findIndex(e => e.id === evaluation.id);
  if (index !== -1) {
    data.evaluations[index] = evaluation;
  } else {
    data.evaluations.push(evaluation);
  }

  await writeJsonFile('evaluations.json', data);
}

export async function updateEvaluation(evaluationId: string, updates: any): Promise<void> {
  const data = await readJsonFile<EvaluationsData>('evaluations.json');
  if (!data.evaluations) data.evaluations = [];

  const index = data.evaluations.findIndex(e => e.id === evaluationId);
  if (index !== -1) {
    data.evaluations[index] = { ...data.evaluations[index], ...updates };
    await writeJsonFile('evaluations.json', data);
  }
}

export async function getEvaluations(): Promise<any[]> {
  const data = await readJsonFile<EvaluationsData>('evaluations.json');
  return data.evaluations || [];
}

export async function getEvaluation(evaluationId: string): Promise<any | null> {
  const evaluations = await getEvaluations();
  return evaluations.find(e => e.id === evaluationId) || null;
}

// ============================================================================
// EVALUATED ANSWERS OPERATIONS
// ============================================================================

interface EvaluatedAnswersData {
  evaluatedAnswers: any[];
}

export async function saveEvaluatedAnswers(evaluatedAnswers: any[]): Promise<void> {
  const data = await readJsonFile<EvaluatedAnswersData>('evaluated-answers.json');
  if (!data.evaluatedAnswers) data.evaluatedAnswers = [];
  data.evaluatedAnswers.push(...evaluatedAnswers);
  await writeJsonFile('evaluated-answers.json', data);
}

export async function getEvaluatedAnswers(): Promise<any[]> {
  const data = await readJsonFile<EvaluatedAnswersData>('evaluated-answers.json');
  return data.evaluatedAnswers || [];
}

// ============================================================================
// WEBHOOK OPERATIONS
// ============================================================================

interface WebhooksData {
  webhooks: any[];
}

export async function saveWebhook(webhook: any): Promise<void> {
  const data = await readJsonFile<WebhooksData>('webhooks.json');
  if (!data.webhooks) data.webhooks = [];
  data.webhooks.push(webhook);
  await writeJsonFile('webhooks.json', data);
}

export async function getWebhooks(): Promise<any[]> {
  const data = await readJsonFile<WebhooksData>('webhooks.json');
  return data.webhooks || [];
}

// ============================================================================
// WEBHOOK EVENT OPERATIONS
// ============================================================================

interface WebhookEventsData {
  events: any[];
}

export async function saveWebhookEvent(event: any): Promise<void> {
  const data = await readJsonFile<WebhookEventsData>('webhook-events.json');
  if (!data.events) data.events = [];
  data.events.push({
    ...event,
    receivedAt: new Date().toISOString()
  });
  await writeJsonFile('webhook-events.json', data);
}

export async function getWebhookEvents(): Promise<any[]> {
  const data = await readJsonFile<WebhookEventsData>('webhook-events.json');
  return data.events || [];
}

export async function getLatestWebhookEvent(eventType: string): Promise<any | null> {
  const events = await getWebhookEvents();
  const filtered = events.filter(e => e.event === eventType);
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function clearAllData(): Promise<void> {
  const files = [
    'config.json',
    'surveys.json',
    'questions.json',
    'answers.json',
    'codeframes.json',
    'evaluations.json',
    'evaluated-answers.json',
    'webhooks.json',
    'webhook-events.json'
  ];

  for (const file of files) {
    const filepath = path.join(CONFIG.storage.dataDir, file);
    try {
      await fs.unlink(filepath);
    } catch (error) {
      // File might not exist, ignore error
    }
  }
}
