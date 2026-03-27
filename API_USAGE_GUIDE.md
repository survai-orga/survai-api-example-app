# SurvAI API Usage Guide

Complete step-by-step guide demonstrating how to use the SurvAI API for automated survey analysis with AI-powered code frame generation and answer evaluation.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Authentication](#authentication)
4. [Complete Workflow](#complete-workflow)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Webhook System](#webhook-system)
7. [Code Examples](#code-examples)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The SurvAI API enables programmatic access to AI-powered survey analysis capabilities:

- **Survey Management** - Create and manage surveys with multiple questions
- **Data Import** - Upload survey responses in bulk
- **AI Code Frame Generation** - Automatically create hierarchical categorization structures using GPT-5
- **AI Answer Evaluation** - Categorize open-ended responses using GPT-4o
- **Webhook Notifications** - Real-time updates on long-running AI operations
- **Results Export** - Retrieve coded results for analysis

### Typical Use Case Flow

```
1. Create survey with questions
2. Upload customer answers
3. Generate AI code frame (GPT-5)
4. Run evaluation to categorize answers (GPT-4o)
5. Retrieve and export results
```

---

## Prerequisites

### 1. API Access

You need either:
- **API Key** (recommended): Format `survai_k_<40 chars>`
- **Firebase Token**: For development/testing

### 2. Webhook Endpoint (Optional but Recommended)

For long-running operations (code frame generation, evaluations), webhooks provide real-time progress updates:

- Public HTTPS endpoint to receive webhook events
- For local development: Use [ngrok](https://ngrok.com/) to expose localhost

**Start ngrok:**
```bash
ngrok http 3000
# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

### 3. Development Environment

```bash
# Install dependencies
npm install axios express dotenv

# For TypeScript
npm install -D typescript @types/node @types/express
```

---

## Authentication

All API requests require authentication via headers:

### Option 1: API Key (Production)

```typescript
headers: {
  'X-API-Key': 'survai_k_your_api_key_here',
  'Content-Type': 'application/json'
}
```

### Option 2: Firebase Token (Development)

```typescript
headers: {
  'Authorization': 'Bearer your_firebase_token',
  'Content-Type': 'application/json'
}
```

### Creating an API Key

1. Log in to SurvAI web interface
2. Navigate to **Profile** → **API Keys**
3. Click **Create New API Key**
4. Copy and securely store the key (shown only once)

---

## Complete Workflow

### Step 1: Initialize API Client

Create a configured HTTP client with authentication:

```typescript
import axios, { AxiosInstance } from 'axios';

class SurvAIClient {
  private client: AxiosInstance;

  constructor(apiKey: string, baseUrl: string = 'https://app.surv-ai.com') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      }
    });

    // Add request/response logging
    this.client.interceptors.request.use(request => {
      console.log(`→ ${request.method?.toUpperCase()} ${request.url}`);
      return request;
    });

    this.client.interceptors.response.use(
      response => {
        console.log(`← ${response.status} ${response.config.url}`);
        return response;
      },
      error => {
        console.error(`✗ ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        console.error(`  Status: ${error.response?.status}`);
        console.error(`  Error: ${JSON.stringify(error.response?.data)}`);
        throw error;
      }
    );
  }
}

const client = new SurvAIClient('survai_k_your_api_key');
```

**Key Points:**
- Store API key securely (environment variables, never commit to git)
- Base URL: `https://app.surv-ai.com` (production) or `https://int.surv-ai.com` (staging)
- 30-second timeout recommended for most operations
- Interceptors provide visibility into API communication

---

### Step 2: Register Webhook (Optional)

Before creating surveys, register a webhook to receive real-time updates:

**Request:**
```typescript
const webhookUrl = 'https://your-domain.ngrok.io/webhooks/survai';

const response = await client.post('/api/v1/webhooks', {
  url: webhookUrl,
  name: 'My Application Webhook',
  events: [
    'code_frame.created',
    'code_frame.failed',
    'evaluation.started',
    'evaluation.progress',
    'evaluation.completed',
    'evaluation.failed'
  ]
});

const webhook = response.data.webhook;
console.log(`Webhook ID: ${webhook.id}`);
console.log(`Webhook Secret: ${webhook.secret}`); // Save this for signature verification
```

**Response:**
```json
{
  "webhook": {
    "id": "2rlhFjQLqTO6cycrb4e0",
    "url": "https://your-domain.ngrok.io/webhooks/survai",
    "name": "My Application Webhook",
    "events": [
      "code_frame.created",
      "code_frame.failed",
      "evaluation.started",
      "evaluation.progress",
      "evaluation.completed",
      "evaluation.failed"
    ],
    "secret": "whsec_BeBpYl-hW...",
    "active": true,
    "created": "2025-01-15T10:30:00Z"
  }
}
```

**Important:**
- Save the `secret` - required for webhook signature verification
- Webhook secret format: `whsec_<base64url>`
- Events are filtered - you only receive subscribed event types

---

### Step 3: Import Survey with Questions and Answers

Use the bulk import endpoint to create everything in one request:

**Request:**
```typescript
const importData = {
  surveyData: {
    name: 'Customer Feedback Survey 2025',
    comment: 'Q1 product feedback collection',
    questions: [
      {
        question_text: 'What improvements would you like to see in our product?',
        question_name: 'product_improvements',
        additional_instruction: 'Focus on features, usability, and performance',
        answers: [
          {
            customer_id: 'customer_001',
            answer_text: 'Better mobile app performance and dark mode support'
          },
          {
            customer_id: 'customer_002',
            answer_text: 'More integrations with third-party tools'
          },
          // ... more answers
          {
            customer_id: 'customer_050',
            answer_text: 'Improved search functionality and keyboard shortcuts'
          }
        ]
      }
    ]
  }
};

const response = await client.post('/api/v1/surveys/import', importData);

const surveyId = response.data.surveyId;
console.log(`Survey created: ${surveyId}`);
```

**Response:**
```json
{
  "surveyId": "KZgOPqQz0YfcA8elN1nr",
  "message": "Survey imported successfully with 1 question(s) and 50 answer(s)"
}
```

**Alternative: Step-by-Step Creation**

If you prefer granular control:

```typescript
// 1. Create survey
const surveyResponse = await client.post('/api/v1/surveys', {
  name: 'Customer Feedback Survey 2025',
  comment: 'Q1 product feedback'
});
const surveyId = surveyResponse.data.survey.id;

// 2. Add question
const questionResponse = await client.post(
  `/api/v1/surveys/${surveyId}/questions`,
  {
    question_text: 'What improvements would you like to see?',
    question_name: 'product_improvements',
    additional_instruction: 'Focus on features and usability'
  }
);
const questionId = questionResponse.data.question.id;

// 3. Upload answers (batch)
const answersResponse = await client.post(
  `/api/v1/surveys/${surveyId}/questions/${questionId}/answers`,
  {
    answers: [
      { customer_id: 'cust_001', answer_text: 'Better mobile app...' },
      // ... more answers
    ]
  }
);
```

---

### Step 4: Generate AI Code Frame (GPT-5)

Create a hierarchical categorization structure using AI:

**Request:**
```typescript
// Get question ID from previous step
const questionsResponse = await client.get(
  `/api/v1/surveys/${surveyId}/questions`
);
const questionId = questionsResponse.data.questions[0].id;

// Trigger code frame generation
const codeFrameResponse = await client.post(
  `/api/v1/surveys/${surveyId}/questions/${questionId}/code_frame`,
  {
    additionalInstruction: 'Create a 2-tier hierarchical structure with 5-8 main categories',
    tierCount: 2
  }
);

console.log(`Code frame job started: ${codeFrameResponse.data.jobId}`);
console.log('Waiting for webhook notification...');
```

**Response:**
```json
{
  "jobId": 10,
  "status": "queued",
  "estimatedDuration": "2-5 minutes"
}
```

**What Happens:**
1. API queues code frame generation job
2. GPT-5 analyzes all answers
3. AI creates hierarchical categorization structure
4. Webhook `code_frame.created` event sent on completion
5. Code frame attached to question

**Webhook Event (code_frame.created):**
```json
{
  "event": "code_frame.created",
  "timestamp": "2025-01-15T10:35:42Z",
  "data": {
    "surveyId": "KZgOPqQz0YfcA8elN1nr",
    "questionId": "YMyt9huiRy7XdSVn320a",
    "tierCount": 2,
    "codeFrame": [
      {
        "id": "1",
        "name": "Performance & Speed",
        "tier": 0,
        "order": 0,
        "children": [
          {
            "id": "1.1",
            "name": "Mobile App Performance",
            "tier": 1,
            "order": 0,
            "children": []
          },
          {
            "id": "1.2",
            "name": "Loading Times",
            "tier": 1,
            "order": 1,
            "children": []
          }
        ]
      },
      {
        "id": "2",
        "name": "Features & Functionality",
        "tier": 0,
        "order": 1,
        "children": [
          {
            "id": "2.1",
            "name": "Integrations",
            "tier": 1,
            "order": 0,
            "children": []
          },
          {
            "id": "2.2",
            "name": "Search & Navigation",
            "tier": 1,
            "order": 1,
            "children": []
          }
        ]
      }
    ]
  }
}
```

**Code Frame Structure:**
- **Hierarchical**: Parent categories contain child categories
- **Tier 0**: Top-level main categories (5-8 typically)
- **Tier 1+**: Subcategories providing more specificity
- **IDs**: Dot-notation (1, 1.1, 1.1.1) for hierarchy representation
- **Order**: Position within sibling nodes

---

### Step 5: Run Answer Evaluation (GPT-4o)

Categorize all answers using the generated code frame:

**Request:**
```typescript
const evaluationResponse = await client.post(
  `/api/v1/surveys/${surveyId}/questions/${questionId}/evaluate`,
  {
    evaluationName: 'Initial Evaluation',
    additionalInstructionEvaluation: 'Be precise and use the most specific codes available'
  }
);

const evaluationId = evaluationResponse.data.evaluationId;
console.log(`Evaluation started: ${evaluationId}`);
console.log('Monitoring progress via webhooks...');
```

**Response:**
```json
{
  "evaluationId": "eval_abc123",
  "status": "started",
  "totalAnswers": 50
}
```

**What Happens:**
1. API queues evaluation job for each answer
2. GPT-4o analyzes each answer against code frame
3. AI assigns relevant category codes with text evidence
4. Webhook events track progress (`evaluation.started`, `evaluation.progress`, `evaluation.completed`)
5. Results stored in database

**Webhook Events During Evaluation:**

**evaluation.started:**
```json
{
  "event": "evaluation.started",
  "timestamp": "2025-01-15T10:36:00Z",
  "data": {
    "evaluationId": "eval_abc123",
    "questionId": "YMyt9huiRy7XdSVn320a",
    "totalAnswers": 50,
    "estimatedDuration": "5-10 minutes"
  }
}
```

**evaluation.progress (sent periodically):**
```json
{
  "event": "evaluation.progress",
  "timestamp": "2025-01-15T10:38:15Z",
  "data": {
    "evaluationId": "eval_abc123",
    "processedAnswers": 25,
    "totalAnswers": 50,
    "progress": 50
  }
}
```

**evaluation.completed:**
```json
{
  "event": "evaluation.completed",
  "timestamp": "2025-01-15T10:42:30Z",
  "data": {
    "evaluationId": "eval_abc123",
    "questionId": "YMyt9huiRy7XdSVn320a",
    "totalAnswers": 50,
    "processedAnswers": 50,
    "duration": "6 minutes 30 seconds"
  }
}
```

---

### Step 6: Retrieve Evaluation Results

Fetch coded answers with category assignments:

**Request:**
```typescript
// Wait for evaluation.completed webhook, then fetch results
const resultsResponse = await client.get(
  `/api/v1/surveys/${surveyId}/questions/${questionId}/evaluations/${evaluationId}`,
  {
    params: {
      // exclude: 'answers' // Set to only get metadata without answers
    }
  }
);

const evaluation = resultsResponse.data.evaluation;
const evaluatedAnswers = resultsResponse.data.evaluatedAnswers;

console.log(`Retrieved ${evaluatedAnswers.length} coded answers`);
```

**Response:**
```json
{
  "evaluation": {
    "id": "eval_abc123",
    "questionId": "YMyt9huiRy7XdSVn320a",
    "name": "Initial Evaluation",
    "totalAnswers": 50,
    "processedAnswers": 50,
    "is_completed": true,
    "started": "2025-01-15T10:36:00Z",
    "completed": "2025-01-15T10:42:30Z"
  },
  "evaluatedAnswers": [
    {
      "id": "evAnswer_001",
      "answerId": "ans_customer_001",
      "answer_text": "Better mobile app performance and dark mode support",
      "codings": [
        {
          "code_path": "Performance & Speed > Mobile App Performance",
          "textbits": ["Better mobile app performance"],
          "tier": 1
        },
        {
          "code_path": "User Interface > Dark Mode",
          "textbits": ["dark mode support"],
          "tier": 1
        }
      ]
    },
    {
      "id": "evAnswer_002",
      "answerId": "ans_customer_002",
      "answer_text": "More integrations with third-party tools",
      "codings": [
        {
          "code_path": "Features & Functionality > Integrations",
          "textbits": ["integrations with third-party tools"],
          "tier": 1
        }
      ]
    }
    // ... 48 more evaluated answers
  ]
}
```

**Result Structure:**
- **evaluatedAnswers**: Array of coded responses
- **codings**: Multiple categories can be assigned per answer
- **code_path**: Full hierarchical path (e.g., "Parent > Child")
- **textbits**: Specific text fragments that justify the coding
- **tier**: Code specificity level (0=top, 1=sub, etc.)

---

### Step 7: Analyze and Export Results

Process the evaluation data for insights:

**Calculate Statistics:**
```typescript
function analyzeResults(evaluatedAnswers: any[]) {
  const totalAnswers = evaluatedAnswers.length;
  const answersWithCodings = evaluatedAnswers.filter(
    a => a.codings && a.codings.length > 0
  );
  const totalCodings = evaluatedAnswers.reduce(
    (sum, a) => sum + (a.codings?.length || 0),
    0
  );
  const avgCodingsPerAnswer = totalCodings / totalAnswers;

  console.log(`Total Answers: ${totalAnswers}`);
  console.log(`Successfully Coded: ${answersWithCodings.length} (${Math.round(answersWithCodings.length / totalAnswers * 100)}%)`);
  console.log(`Total Codings: ${totalCodings}`);
  console.log(`Average Codings per Answer: ${avgCodingsPerAnswer.toFixed(2)}`);

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
  const topCategories = Object.entries(codeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  console.log('\nTop Categories:');
  for (const [path, count] of topCategories) {
    const percentage = Math.round((count / totalAnswers) * 100);
    console.log(`  ${count} (${percentage}%) - ${path}`);
  }
}

analyzeResults(evaluatedAnswers);
```

**Output Example:**
```
Total Answers: 50
Successfully Coded: 50 (100%)
Total Codings: 87
Average Codings per Answer: 1.74

Top Categories:
  15 (30%) - Performance & Speed > Mobile App Performance
  12 (24%) - Features & Functionality > Integrations
  10 (20%) - User Interface > Dark Mode
   8 (16%) - Features & Functionality > Search & Navigation
   7 (14%) - Performance & Speed > Loading Times
   6 (12%) - User Interface > Responsive Design
   5 (10%) - Documentation > User Guides
   4 ( 8%) - Support > Response Time
   3 ( 6%) - Pricing > Subscription Plans
   3 ( 6%) - Security > Data Privacy
```

**Export to CSV:**
```typescript
import { createObjectCsvWriter } from 'csv-writer';

async function exportToCSV(evaluatedAnswers: any[], outputPath: string) {
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'answerId', title: 'Answer ID' },
      { id: 'answerText', title: 'Answer Text' },
      { id: 'codePaths', title: 'Categories' },
      { id: 'textbits', title: 'Evidence' },
      { id: 'codingCount', title: 'Code Count' }
    ]
  });

  const records = evaluatedAnswers.map(answer => ({
    answerId: answer.answerId,
    answerText: answer.answer_text,
    codePaths: answer.codings.map((c: any) => c.code_path).join(' | '),
    textbits: answer.codings.map((c: any) => c.textbits.join(', ')).join(' | '),
    codingCount: answer.codings.length
  }));

  await csvWriter.writeRecords(records);
  console.log(`CSV exported: ${outputPath}`);
}

await exportToCSV(evaluatedAnswers, './data/export/results.csv');
```

---

## API Endpoints Reference

### Survey Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/surveys` | Create new survey |
| POST | `/api/v1/surveys/import` | Bulk import survey with questions & answers |
| GET | `/api/v1/surveys/{surveyId}` | Get survey details |
| DELETE | `/api/v1/surveys/{surveyId}` | Delete survey |

### Question Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/surveys/{surveyId}/questions` | Create question |
| GET | `/api/v1/surveys/{surveyId}/questions` | List questions |
| GET | `/api/v1/surveys/{surveyId}/questions/{questionId}` | Get question details |
| DELETE | `/api/v1/surveys/{surveyId}/questions/{questionId}` | Delete question |

### Answer Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/surveys/{surveyId}/questions/{questionId}/answers` | Upload answers (batch) |
| GET | `/api/v1/surveys/{surveyId}/questions/{questionId}/answers` | List answers |

### Code Frame Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/surveys/{surveyId}/questions/{questionId}/code_frame` | Generate code frame (async) |
| GET | `/api/v1/surveys/{surveyId}/questions/{questionId}/code_frame` | Get code frame |

### Evaluation Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/surveys/{surveyId}/questions/{questionId}/evaluate` | Start evaluation (async) |
| GET | `/api/v1/surveys/{surveyId}/questions/{questionId}/evaluations/{evaluationId}` | Get results |
| DELETE | `/api/v1/surveys/{surveyId}/questions/{questionId}/evaluations/{evaluationId}` | Delete evaluation |

### Webhook Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/webhooks` | Register webhook |
| GET | `/api/v1/webhooks` | List webhooks |
| GET | `/api/v1/webhooks/{webhookId}` | Get webhook details |
| DELETE | `/api/v1/webhooks/{webhookId}` | Delete webhook |
| GET | `/api/v1/webhooks/{webhookId}/deliveries` | List delivery attempts |
| POST | `/api/v1/webhooks/{webhookId}/test` | Send test event |

---

## Webhook System

### Overview

Webhooks enable real-time notifications for long-running AI operations without polling.

### Webhook Events

| Event | Description | When Sent |
|-------|-------------|-----------|
| `code_frame.created` | Code frame generation completed | GPT-5 finishes creating hierarchical structure |
| `code_frame.failed` | Code frame generation failed | Error during generation |
| `evaluation.started` | Evaluation job initiated | Processing begins |
| `evaluation.progress` | Evaluation progress update | Every ~10-20% progress |
| `evaluation.completed` | Evaluation finished successfully | All answers processed |
| `evaluation.failed` | Evaluation job failed | Error during processing |

### Setting Up Webhook Receiver

**Express Server Example:**
```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// Webhook endpoint
app.post('/webhooks/survai', async (req, res) => {
  const signature = req.headers['x-survai-signature'] as string;
  const deliveryId = req.headers['x-survai-delivery-id'] as string;
  const event = req.body;

  // Verify signature
  if (!verifySignature(req.body, signature, WEBHOOK_SECRET)) {
    console.error('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Log receipt
  console.log(`✓ Webhook received: ${event.event}`);
  console.log(`  Delivery ID: ${deliveryId}`);

  // Handle event
  await handleWebhookEvent(event);

  res.status(200).json({ received: true });
});

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
```

### Signature Verification

**Critical for security** - always verify webhook signatures:

```typescript
function verifySignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  // Extract timestamp and signature from header
  // Format: t=<timestamp>,v1=<signature>
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const sig = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !sig) {
    return false;
  }

  // Create expected signature
  const payloadString = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(sig, 'hex'),
    Buffer.from(expectedSig, 'hex')
  );
}
```

### Webhook Headers

Every webhook delivery includes:

```
X-SurvAI-Signature: t=1705318560,v1=abc123...
X-SurvAI-Delivery-ID: delivery_xyz789
Content-Type: application/json
```

### Retry Logic

If your endpoint returns non-2xx status:
- **1st retry**: 60 seconds later
- **2nd retry**: 300 seconds (5 minutes) later
- **3rd retry**: 900 seconds (15 minutes) later

After 3 failed attempts, delivery marked as failed.

### Testing Webhooks

```typescript
// Send test event to webhook
await client.post(`/api/v1/webhooks/${webhookId}/test`);
```

---

## Code Examples

### Complete Workflow Script

```typescript
import { SurvAIClient } from './api/client';
import { startWebhookServer } from './webhook-server';
import { waitForWebhook } from './utils/wait';

async function runCompleteWorkflow() {
  // 1. Start webhook server
  await startWebhookServer();

  // 2. Initialize client
  const client = new SurvAIClient(process.env.SURVAI_API_KEY);

  // 3. Register webhook
  const webhook = await client.createWebhook({
    url: 'https://your-domain.ngrok.io/webhooks/survai',
    name: 'My Webhook',
    events: ['code_frame.created', 'evaluation.completed']
  });

  // 4. Import survey
  const importResponse = await client.importSurvey({
    name: 'Customer Feedback',
    questions: [{
      question_text: 'What would you improve?',
      answers: [
        { customer_id: '001', answer_text: 'Better mobile app' },
        // ... more answers
      ]
    }]
  });
  const surveyId = importResponse.surveyId;

  // 5. Get question
  const questions = await client.getQuestions(surveyId);
  const questionId = questions.questions[0].id;

  // 6. Generate code frame
  await client.createCodeFrame(surveyId, questionId, {
    tierCount: 2
  });
  const codeFrameEvent = await waitForWebhook('code_frame.created');
  console.log('Code frame ready!');

  // 7. Run evaluation
  const evaluation = await client.createEvaluation(surveyId, questionId, {
    evaluationName: 'Initial Analysis'
  });
  const evalCompleted = await waitForWebhook('evaluation.completed');
  console.log('Evaluation complete!');

  // 8. Get results
  const results = await client.getEvaluation(
    surveyId,
    questionId,
    evaluation.evaluationId
  );

  console.log(`Analyzed ${results.evaluatedAnswers.length} answers`);
  return results;
}
```

### Waiting for Webhook Events

```typescript
/**
 * Wait for specific webhook event with timeout
 */
export function waitForWebhook(
  eventType: string,
  timeoutMs: number = 300000 // 5 minutes default
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${eventType}`));
    }, timeoutMs);

    // Event emitter listens to webhook server
    webhookEmitter.once(eventType, (event) => {
      clearTimeout(timeout);
      resolve(event);
    });
  });
}
```

### Fallback: Polling for Results

If webhooks not available, poll for completion:

```typescript
async function waitForCodeFrame(
  client: SurvAIClient,
  surveyId: string,
  questionId: string,
  maxWaitMs: number = 300000
): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 10000; // 10 seconds

  while (Date.now() - startTime < maxWaitMs) {
    const question = await client.getQuestion(surveyId, questionId);

    if (question.question.code_frame) {
      return question.question.code_frame;
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Timeout waiting for code frame');
}
```

---

## Best Practices

### 1. API Key Security

✅ **DO:**
- Store API keys in environment variables
- Use `.env` files (add to `.gitignore`)
- Rotate keys periodically
- Use separate keys for dev/staging/prod

❌ **DON'T:**
- Commit API keys to version control
- Share keys in chat/email
- Use production keys in development
- Log API keys in application logs

### 2. Webhook Security

✅ **DO:**
- Always verify webhook signatures
- Use HTTPS endpoints only
- Implement idempotency (handle duplicate deliveries)
- Log delivery IDs for debugging
- Return 2xx status quickly (process async if needed)

❌ **DON'T:**
- Skip signature verification
- Expose webhook endpoints without auth
- Block webhook response with long processing
- Trust webhook payload without validation

### 3. Error Handling

```typescript
async function safeApiCall<T>(
  operation: () => Promise<T>,
  retries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Rate limit - wait and retry
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          console.log(`Rate limited, waiting ${retryAfter}s...`);
          await new Promise(r => setTimeout(r, retryAfter * 1000));
          continue;
        }

        // Server error - retry with backoff
        if (error.response?.status && error.response.status >= 500) {
          if (attempt < retries) {
            const backoff = Math.pow(2, attempt) * 1000;
            console.log(`Server error, retrying in ${backoff}ms...`);
            await new Promise(r => setTimeout(r, backoff));
            continue;
          }
        }

        // Client error - don't retry
        if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }
      }

      // Unknown error
      if (attempt === retries) throw error;
    }
  }

  throw new Error('Max retries exceeded');
}
```

### 4. Rate Limiting

Default limits (configurable per API key):
- **60 requests/minute**
- **1000 requests/hour**
- **10,000 requests/day**

Handle rate limits gracefully:
```typescript
if (error.response?.status === 429) {
  const retryAfter = error.response.headers['retry-after'];
  // Wait and retry
}
```

### 5. Batch Operations

For large datasets, use bulk endpoints:

```typescript
// ✅ Good: Bulk import
await client.importSurvey({
  name: 'Survey',
  questions: [{
    question_text: 'Q1',
    answers: allAnswers // Upload all at once
  }]
});

// ❌ Bad: Individual inserts
for (const answer of allAnswers) {
  await client.createAnswer(surveyId, questionId, answer); // Slow!
}
```

### 6. Monitoring & Logging

```typescript
// Log all API interactions
client.interceptors.request.use(req => {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
  return req;
});

// Track webhook deliveries
app.post('/webhooks/survai', (req, res) => {
  const deliveryId = req.headers['x-survai-delivery-id'];
  logger.info('Webhook received', {
    event: req.body.event,
    deliveryId,
    timestamp: req.body.timestamp
  });
  // ... handle event
});
```

---

## Troubleshooting

### Authentication Errors

**Error: `401 Unauthorized - Invalid API key`**

✓ Verify API key format: `survai_k_<40 chars>`
✓ Check header: `X-API-Key: survai_k_...`
✓ Ensure key is active (not deleted/revoked)
✓ Verify you're using correct environment (prod vs staging)

### Webhook Issues

**Error: Webhooks not received**

✓ Verify webhook URL is publicly accessible (test with `curl`)
✓ Check webhook is active: `GET /api/v1/webhooks/{webhookId}`
✓ Ensure your server returns 2xx status quickly
✓ Check firewall/security group settings
✓ For ngrok: Verify tunnel is running and URL matches

**Error: `Invalid webhook signature`**

✓ Use exact webhook secret from registration response
✓ Verify signature verification implementation
✓ Check timestamp tolerance (reject old signatures)
✓ Ensure payload is stringified correctly

### Code Frame Generation

**Error: `code_frame.failed` event received**

Common causes:
- Not enough answers (minimum ~10 required)
- Answers too short/generic
- OpenAI API issues (check status page)

Solutions:
- Provide more diverse answers
- Add `additionalInstruction` for context
- Retry with adjusted parameters

### Evaluation Issues

**Error: Evaluation slow or timing out**

- Large answer counts (1000+) take time (10-30 min)
- Use webhooks to monitor progress
- Consider breaking into batches

**Error: Low coding quality**

- Refine code frame with better instructions
- Ensure answers are clear and detailed
- Use `additionalInstructionEvaluation` parameter

### Rate Limiting

**Error: `429 Too Many Requests`**

```typescript
// Respect Retry-After header
const retryAfter = parseInt(
  error.response.headers['retry-after'] || '60'
);
await new Promise(r => setTimeout(r, retryAfter * 1000));
```

### Data Export Issues

**Error: Large result sets**

- Use `exclude=answers` parameter to get metadata only
- Paginate if API supports it (check docs)
- Export incrementally to avoid memory issues

---

## Summary

This guide covered:

1. ✅ **Authentication** - API keys and Firebase tokens
2. ✅ **Survey Creation** - Bulk import and step-by-step
3. ✅ **AI Code Frame** - GPT-5 hierarchical categorization
4. ✅ **Answer Evaluation** - GPT-4o coding with evidence
5. ✅ **Webhooks** - Real-time notifications
6. ✅ **Results Analysis** - Statistics and exports
7. ✅ **Best Practices** - Security, error handling, monitoring

### Quick Reference

```typescript
// Complete workflow in ~30 lines
const client = new SurvAIClient(apiKey);

// 1. Register webhook
const webhook = await client.createWebhook({ url, name, events });

// 2. Import survey
const { surveyId } = await client.importSurvey({ name, questions });

// 3. Get question
const { questions } = await client.getQuestions(surveyId);
const questionId = questions[0].id;

// 4. Generate code frame
await client.createCodeFrame(surveyId, questionId, { tierCount: 2 });
await waitForWebhook('code_frame.created');

// 5. Run evaluation
const { evaluationId } = await client.createEvaluation(surveyId, questionId, {
  evaluationName: 'Analysis'
});
await waitForWebhook('evaluation.completed');

// 6. Get results
const results = await client.getEvaluation(surveyId, questionId, evaluationId);
console.log(`Coded ${results.evaluatedAnswers.length} answers`);
```

### Next Steps

- Review the [example application](./src/index.ts) for complete implementation
- Check [API documentation](../docs/) for detailed endpoint reference
- Test with [mock mode](./README.md#mock-mode) before production
- Set up monitoring and alerting for production deployments

---

**Need Help?**
- Documentation: `./README.md`
- Example Code: `./src/`
- Issues: Contact support team
