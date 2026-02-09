# SurvAI API Quick Reference

One-page reference for common SurvAI API operations.

---

## Authentication

```typescript
// API Key (Production)
headers: {
  'X-API-Key': 'survai_k_your_key_here',
  'Content-Type': 'application/json'
}

// Firebase Token (Development)
headers: {
  'Authorization': 'Bearer your_token',
  'Content-Type': 'application/json'
}
```

**Base URLs:**
- Production: `https://app.surv-ai.com`
- Staging: `https://int.surv-ai.com`

---

## Common Workflows

### 1. Bulk Import (Recommended)

```typescript
POST /api/v1/surveys/import
{
  "surveyData": {
    "name": "Survey Name",
    "comment": "Optional description",
    "questions": [{
      "question_text": "Your question?",
      "question_name": "question_id",
      "additional_instruction": "Context for AI",
      "answers": [
        { "customer_id": "001", "answer_text": "Response 1" },
        { "customer_id": "002", "answer_text": "Response 2" }
      ]
    }]
  }
}

// Response: { surveyId, message }
```

### 2. Generate Code Frame

```typescript
POST /api/v1/surveys/{surveyId}/questions/{questionId}/code_frame
{
  "additionalInstruction": "Create 2-tier structure with 5-8 main categories",
  "tierCount": 2
}

// Response: { jobId, status: "queued" }
// Wait for webhook: code_frame.created
```

### 3. Run Evaluation

```typescript
POST /api/v1/surveys/{surveyId}/questions/{questionId}/evaluate
{
  "evaluationName": "Initial Analysis",
  "additionalInstructionEvaluation": "Be precise with codes"
}

// Response: { evaluationId, status: "started" }
// Wait for webhook: evaluation.completed
```

### 4. Get Results

```typescript
GET /api/v1/surveys/{surveyId}/questions/{questionId}/evaluations/{evaluationId}
// Optional: ?exclude=answers (metadata only)

// Response: { evaluation, evaluatedAnswers }
```

---

## Webhook Events

| Event | Description | Data |
|-------|-------------|------|
| `code_frame.created` | Code frame ready | `codeFrame`, `tierCount` |
| `code_frame.failed` | Generation failed | `error`, `questionId` |
| `evaluation.started` | Evaluation begun | `totalAnswers` |
| `evaluation.progress` | Progress update | `processedAnswers`, `progress` |
| `evaluation.completed` | All done | `processedAnswers` |
| `evaluation.failed` | Processing error | `error`, `processedAnswers` |

### Register Webhook

```typescript
POST /api/v1/webhooks
{
  "url": "https://your-app.com/webhooks/survai",
  "name": "My Webhook",
  "events": ["code_frame.created", "evaluation.completed"]
}

// Response: { webhook: { id, secret, ... } }
// Save the secret for signature verification!
```

### Verify Signature

```typescript
function verifySignature(payload: any, signature: string, secret: string): boolean {
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const sig = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(sig, 'hex'),
    Buffer.from(expectedSig, 'hex')
  );
}
```

---

## All Endpoints

### Surveys

```typescript
POST   /api/v1/surveys                    // Create survey
POST   /api/v1/surveys/import             // Bulk import (recommended)
GET    /api/v1/surveys/{surveyId}         // Get survey
DELETE /api/v1/surveys/{surveyId}         // Delete survey
```

### Questions

```typescript
POST   /api/v1/surveys/{surveyId}/questions                     // Create question
GET    /api/v1/surveys/{surveyId}/questions                     // List questions
GET    /api/v1/surveys/{surveyId}/questions/{questionId}        // Get question
DELETE /api/v1/surveys/{surveyId}/questions/{questionId}        // Delete question
```

### Answers

```typescript
POST   /api/v1/surveys/{surveyId}/questions/{questionId}/answers    // Upload batch
GET    /api/v1/surveys/{surveyId}/questions/{questionId}/answers    // List answers
```

### Code Frame

```typescript
POST   /api/v1/surveys/{surveyId}/questions/{questionId}/code_frame    // Generate (async)
GET    /api/v1/surveys/{surveyId}/questions/{questionId}/code_frame    // Get code frame
```

### Evaluations

```typescript
POST   /api/v1/surveys/{surveyId}/questions/{questionId}/evaluate                          // Start (async)
GET    /api/v1/surveys/{surveyId}/questions/{questionId}/evaluations/{evaluationId}        // Get results
DELETE /api/v1/surveys/{surveyId}/questions/{questionId}/evaluations/{evaluationId}        // Delete
```

### Webhooks

```typescript
POST   /api/v1/webhooks                          // Register webhook
GET    /api/v1/webhooks                          // List webhooks
GET    /api/v1/webhooks/{webhookId}              // Get webhook
DELETE /api/v1/webhooks/{webhookId}              // Delete webhook
GET    /api/v1/webhooks/{webhookId}/deliveries   // List deliveries
POST   /api/v1/webhooks/{webhookId}/test         // Send test event
```

---

## Response Structures

### Survey

```json
{
  "id": "KZgOPqQz0YfcA8elN1nr",
  "name": "Customer Feedback Survey 2025",
  "comment": "Q1 feedback",
  "created": "2025-01-15T10:30:00Z"
}
```

### Question

```json
{
  "id": "YMyt9huiRy7XdSVn320a",
  "surveyId": "KZgOPqQz0YfcA8elN1nr",
  "question_text": "What improvements would you like?",
  "question_name": "product_improvements",
  "additional_instruction": "Focus on features",
  "code_frame": [ /* hierarchical structure */ ]
}
```

### Code Frame Node

```json
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
    }
  ]
}
```

### Evaluation

```json
{
  "id": "eval_abc123",
  "questionId": "YMyt9huiRy7XdSVn320a",
  "name": "Initial Evaluation",
  "totalAnswers": 50,
  "processedAnswers": 50,
  "is_completed": true,
  "started": "2025-01-15T10:36:00Z",
  "completed": "2025-01-15T10:42:30Z"
}
```

### Evaluated Answer

```json
{
  "id": "evAnswer_001",
  "answerId": "ans_customer_001",
  "answer_text": "Better mobile app performance and dark mode",
  "codings": [
    {
      "code_path": "Performance & Speed > Mobile App Performance",
      "textbits": ["Better mobile app performance"],
      "tier": 1
    },
    {
      "code_path": "User Interface > Dark Mode",
      "textbits": ["dark mode"],
      "tier": 1
    }
  ]
}
```

### Webhook

```json
{
  "id": "2rlhFjQLqTO6cycrb4e0",
  "url": "https://your-app.com/webhooks/survai",
  "name": "My Webhook",
  "events": ["code_frame.created", "evaluation.completed"],
  "secret": "whsec_BeBpYl-hW...",
  "active": true,
  "created": "2025-01-15T10:30:00Z"
}
```

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid data)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Server Error

### Rate Limits (Default)

- 60 requests/minute
- 1000 requests/hour
- 10,000 requests/day

### Retry on Rate Limit

```typescript
if (error.response?.status === 429) {
  const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
  await new Promise(r => setTimeout(r, retryAfter * 1000));
  // Retry request
}
```

### Exponential Backoff (Server Errors)

```typescript
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1 || error.response?.status < 500) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Complete Example

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://app.surv-ai.com',
  headers: { 'X-API-Key': process.env.SURVAI_API_KEY }
});

// 1. Register webhook
const webhook = await client.post('/api/v1/webhooks', {
  url: 'https://my-app.ngrok.io/webhooks/survai',
  name: 'My Webhook',
  events: ['code_frame.created', 'evaluation.completed']
});
console.log('Webhook secret:', webhook.data.webhook.secret);

// 2. Import survey
const importRes = await client.post('/api/v1/surveys/import', {
  surveyData: {
    name: 'Customer Feedback',
    questions: [{
      question_text: 'What would you improve?',
      answers: [
        { customer_id: '001', answer_text: 'Better mobile app' },
        { customer_id: '002', answer_text: 'More integrations' }
      ]
    }]
  }
});
const surveyId = importRes.data.surveyId;

// 3. Get question
const questions = await client.get(`/api/v1/surveys/${surveyId}/questions`);
const questionId = questions.data.questions[0].id;

// 4. Generate code frame
await client.post(
  `/api/v1/surveys/${surveyId}/questions/${questionId}/code_frame`,
  { tierCount: 2 }
);
// Wait for webhook: code_frame.created

// 5. Run evaluation
const evalRes = await client.post(
  `/api/v1/surveys/${surveyId}/questions/${questionId}/evaluate`,
  { evaluationName: 'Initial Analysis' }
);
const evaluationId = evalRes.data.evaluationId;
// Wait for webhook: evaluation.completed

// 6. Get results
const results = await client.get(
  `/api/v1/surveys/${surveyId}/questions/${questionId}/evaluations/${evaluationId}`
);

console.log(`Analyzed ${results.data.evaluatedAnswers.length} answers`);
console.log('Top categories:');
const codeCounts: Record<string, number> = {};
for (const answer of results.data.evaluatedAnswers) {
  for (const coding of answer.codings) {
    codeCounts[coding.code_path] = (codeCounts[coding.code_path] || 0) + 1;
  }
}
Object.entries(codeCounts)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5)
  .forEach(([path, count]) => console.log(`  ${count}x ${path}`));
```

---

## Development Tips

### Local Testing with ngrok

```bash
# Start ngrok
ngrok http 3000

# Copy HTTPS URL
# Use in webhook registration: https://abc123.ngrok.io/webhooks/survai
```

### Environment Variables

```bash
# .env file
SURVAI_API_KEY=survai_k_your_key_here
SURVAI_API_BASE_URL=https://int.surv-ai.com  # or https://app.surv-ai.com
WEBHOOK_PORT=3000
WEBHOOK_BASE_URL=https://your-app.ngrok.io
WEBHOOK_SECRET=whsec_...  # From webhook registration
```

### Logging API Calls

```typescript
client.interceptors.request.use(req => {
  console.log(`→ ${req.method?.toUpperCase()} ${req.url}`);
  return req;
});

client.interceptors.response.use(
  res => {
    console.log(`← ${res.status} ${res.config.url}`);
    return res;
  },
  error => {
    console.error(`✗ ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    console.error(`  Status: ${error.response?.status}`);
    console.error(`  Error: ${JSON.stringify(error.response?.data)}`);
    throw error;
  }
);
```

---

## Timing Estimates

| Operation | Duration | Notes |
|-----------|----------|-------|
| Import Survey | 1-2 seconds | Depends on answer count |
| Generate Code Frame | 2-5 minutes | GPT-5, depends on answer diversity |
| Run Evaluation | 5-10 minutes | GPT-4o, ~10-12 sec per answer |
| Retrieve Results | 1-2 seconds | Instant database query |

**Total Workflow (50 answers):** ~10-20 minutes

---

## Resources

- **Full Guide**: [`API_USAGE_GUIDE.md`](./API_USAGE_GUIDE.md)
- **Workflow Diagram**: [`WORKFLOW_DIAGRAM.md`](./WORKFLOW_DIAGRAM.md)
- **Example App**: [`src/index.ts`](./src/index.ts)
- **Implementation Plan**: [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)
- **API Client**: [`src/api/client.ts`](./src/api/client.ts)
