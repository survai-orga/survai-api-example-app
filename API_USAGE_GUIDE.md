# SurvAI API Usage Guide

Complete guide for integrating with the SurvAI API for AI-powered survey analysis.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Complete Workflow](#complete-workflow)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Webhook System](#webhook-system)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Overview

The SurvAI API provides programmatic access to AI-powered survey analysis:

```
Import survey → Generate code frame (GPT-5) → Evaluate answers (GPT-4o) → Export results
```

Long-running AI operations (code frame generation, evaluations) use webhooks for real-time progress updates.

## Authentication

All requests require one of:

```typescript
// API Key (production) — format: survai_k_<40 chars>
headers: { 'X-API-Key': 'survai_k_your_key_here' }

// Firebase Token (development)
headers: { 'Authorization': 'Bearer your_firebase_token' }
```

Create API keys via SurvAI web interface: **Profile → API Keys → Create New API Key**.

## Complete Workflow

### 1. Initialize Client

```typescript
import { SurvAIClient } from './api/client';

const client = new SurvAIClient('survai_k_your_api_key');
```

The client handles authentication, request/response logging, and error formatting. See `src/api/client.ts` for the implementation.

### 2. Register Webhook

```typescript
const webhook = await client.createWebhook({
  url: 'https://your-domain.ngrok.io/webhooks/survai',
  name: 'My Webhook',
  events: [
    'code_frame.created', 'code_frame.failed',
    'evaluation.started', 'evaluation.progress',
    'evaluation.completed', 'evaluation.failed'
  ]
});
// Save webhook.secret for signature verification
```

Response includes a `secret` (format: `whsec_...`) — save it for signature verification.

### 3. Import Survey

Bulk import creates the survey, question, and all answers in one request:

```typescript
const { surveyId } = await client.importSurvey({
  name: 'Customer Feedback Survey 2025',
  comment: 'Q1 product feedback',
  questions: [{
    question_text: 'What improvements would you like to see?',
    question_name: 'product_improvements',
    additional_instruction: 'Focus on features, usability, and performance',
    answers: [
      { customer_id: 'cust_001', answer_text: 'Better mobile performance' },
      { customer_id: 'cust_002', answer_text: 'More integrations' },
      // ...
    ]
  }]
});
```

Alternatively, use the step-by-step approach: `createSurvey` → `createQuestion` → `createAnswers`.

### 4. Generate Code Frame (GPT-5)

```typescript
const questions = await client.getQuestions(surveyId);
const questionId = questions.questions[0].id;

await client.createCodeFrame(surveyId, questionId, {
  additionalInstruction: 'Create a 2-tier structure with 5-8 main categories',
  tierCount: 2
});

// Wait for webhook: code_frame.created (typically 2-5 minutes)
```

The AI analyzes all answers and creates a hierarchical categorization structure:

```
1. Performance & Speed
   1.1 Mobile App Performance
   1.2 Loading Times
2. Features & Functionality
   2.1 Integrations
   2.2 Search & Navigation
```

### 5. Run Evaluation (GPT-4o)

```typescript
const { evaluationId } = await client.createEvaluation(surveyId, questionId, {
  evaluationName: 'Initial Evaluation',
  additionalInstructionEvaluation: 'Be precise and use the most specific codes'
});

// Wait for webhook: evaluation.completed (5-30 min depending on answer count)
```

Progress webhooks (`evaluation.progress`) are sent periodically with percentage updates.

### 6. Retrieve Results

```typescript
const { evaluation, evaluatedAnswers } = await client.getEvaluation(
  surveyId, questionId, evaluationId, false // false = include answers
);
```

Each evaluated answer includes:
- **codings** — assigned category codes (multiple per answer possible)
- **code_path** — full hierarchical path (e.g. "Performance & Speed > Mobile App")
- **textbits** — specific text fragments justifying the coding

### 7. Analyze & Export

See `src/index.ts` for the full analysis and export implementation, including:
- Code frequency statistics
- Top categories ranking
- CSV export with code paths and evidence
- JSON report generation

## API Endpoints Reference

### Surveys

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/surveys` | Create survey |
| `POST` | `/api/v1/surveys/import` | Bulk import (survey + questions + answers) |
| `GET` | `/api/v1/surveys/{surveyId}` | Get survey |
| `DELETE` | `/api/v1/surveys/{surveyId}` | Delete survey |

### Questions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/surveys/{surveyId}/questions` | Create question |
| `GET` | `/api/v1/surveys/{surveyId}/questions` | List questions |
| `GET` | `/api/v1/surveys/{surveyId}/questions/{questionId}` | Get question |

### Answers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/surveys/{surveyId}/questions/{questionId}/answers` | Create answers (single or batch) |
| `GET` | `/api/v1/surveys/{surveyId}/questions/{questionId}/answers` | List answers |

### Code Frame

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/surveys/{surveyId}/questions/{questionId}/code_frame` | Generate code frame (async) |

### Evaluations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/surveys/{surveyId}/questions/{questionId}/evaluate` | Start evaluation (async) |
| `GET` | `.../evaluations` | List evaluations |
| `GET` | `.../evaluations/{evaluationId}` | Get results (use `?exclude=answers` for metadata only) |
| `POST` | `.../continue-evaluations` | Re-evaluate with new answers (tracking surveys) |
| `DELETE` | `.../evaluations/{evaluationId}` | Delete evaluation |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/webhooks` | Register webhook |
| `GET` | `/api/v1/webhooks` | List webhooks |
| `DELETE` | `/api/v1/webhooks/{webhookId}` | Delete webhook |
| `GET` | `/api/v1/webhooks/{webhookId}/deliveries` | List delivery attempts |
| `POST` | `/api/v1/webhooks/{webhookId}/test` | Send test event |

## Webhook System

### Events

| Event | Description |
|-------|-------------|
| `code_frame.created` | Code frame generation completed |
| `code_frame.failed` | Code frame generation failed |
| `evaluation.started` | Evaluation processing began |
| `evaluation.progress` | Progress update (~every 10-20%) |
| `evaluation.completed` | All answers processed |
| `evaluation.failed` | Evaluation failed |

### Headers

```
X-SurvAI-Signature: sha256=<hex_digest>
X-SurvAI-Delivery-ID: <unique_id>
Content-Type: application/json
```

### Signature Verification

Always verify signatures using HMAC SHA-256 with timing-safe comparison. See `src/webhook-server/signature.ts` for the implementation.

### Retry Policy

Failed deliveries (non-2xx response) are retried:
1. After 60 seconds
2. After 5 minutes
3. After 15 minutes

After 3 failures, the delivery is marked as failed.

## Best Practices

**Authentication**
- Store API keys in environment variables, never in code
- Use separate keys for dev/staging/prod
- Rotate keys periodically

**Webhooks**
- Always verify signatures
- Return 2xx quickly, process events async if needed
- Handle duplicate deliveries (idempotency)

**Performance**
- Use bulk import instead of individual answer creation
- Use `?exclude=answers` when you only need evaluation metadata
- Respect rate limits (60 req/min, 1000 req/hour)

**Error Handling**
- Retry on 429 (rate limit) — respect `Retry-After` header
- Retry on 5xx with exponential backoff
- Don't retry on 4xx (client errors)

## Troubleshooting

**401 Unauthorized**
→ Check API key format (`survai_k_<40 chars>`), ensure key is active, verify correct header name (`X-API-Key`)

**Webhooks not received**
→ Verify URL is publicly accessible, check ngrok tunnel is running, ensure server returns 2xx status

**Invalid webhook signature**
→ Use the exact secret from webhook registration, verify raw body is used for HMAC (not parsed JSON)

**Code frame generation failed**
→ Need minimum ~10 answers, ensure answers are substantive (not empty/single-word), check `additionalInstruction`

**Evaluation slow**
→ 1000+ answers can take 10-30 min, monitor via `evaluation.progress` webhooks

**429 Too Many Requests**
→ Wait for `Retry-After` header duration, implement exponential backoff
