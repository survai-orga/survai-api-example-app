# SurvAI API Example

Example application demonstrating complete SurvAI API integration — from survey import to AI-powered evaluation and export.

## Workflow

1. **Register Webhook** → receive real-time notifications for async AI operations
2. **Import Survey** → bulk upload questions and answers
3. **Generate Code Frame** → AI creates hierarchical categorization
4. **Run Evaluation** → AI categorizes all answers against the code frame
5. **Retrieve & Export** → download results as CSV/JSON report

See [WORKFLOW_DIAGRAM.md](./WORKFLOW_DIAGRAM.md) for visual representation.

## Documentation

- **[API Usage Guide](./API_USAGE_GUIDE.md)** — comprehensive endpoint reference with code examples
- **[Workflow Diagram](./WORKFLOW_DIAGRAM.md)** — visual representation of the complete flow

## Quick Start

### Prerequisites

- Node.js 18+
- A SurvAI API key
- [ngrok](https://ngrok.com) for webhook tunneling (local dev)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API key and webhook URL
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SURVAI_API_KEY` | Yes | API key for authentication |
| `SURVAI_API_BASE_URL` | No | API base URL (default: `http://localhost:5173`) |
| `WEBHOOK_BASE_URL` | Yes | Public URL for webhooks (e.g. ngrok URL) |
| `WEBHOOK_PORT` | No | Webhook server port (default: `3000`) |

### Webhook Setup (ngrok)

```bash
# 1. Sign up at https://dashboard.ngrok.com/signup and get your auth token
ngrok config add-authtoken YOUR_TOKEN

# 2. Start tunnel
ngrok http 3000

# 3. Copy the https URL to WEBHOOK_BASE_URL in .env
```

### Run

```bash
# Full workflow (import → code frame → evaluation → export)
npm run dev

# Tracking survey mode (add answers to existing survey, re-evaluate)
npm run tracking

# Webhook server only
npm run webhook
```

## Project Structure

```
src/
├── api/client.ts              # SurvAI API client (typed, with logging)
├── config.ts                  # Environment config + validation
├── index.ts                   # Main workflow orchestration
├── tracking-survey.ts         # Tracking survey example
├── storage/db.ts              # JSON file storage (createCollection<T> factory)
├── utils/
│   ├── code-frame.ts          # Code frame display + counting utilities
│   ├── export.ts              # CSV + JSON report generation
│   └── wait.ts                # Webhook event polling
├── webhook-server/
│   ├── server.ts              # Express webhook receiver
│   ├── handlers.ts            # Event handlers (code_frame, evaluation)
│   └── signature.ts           # HMAC SHA-256 signature verification
└── examples/
    ├── sample-data.ts         # Sample survey answers
    └── tracking-survey-data.ts # Tracking survey sample data
```

## Authentication

```typescript
headers: { 'X-API-Key': 'survai_k_your_key_here' }
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run full workflow |
| `npm run tracking` | Run tracking survey example |
| `npm run webhook` | Start webhook server only |
| `npm run build` | Compile TypeScript |
| `npm test` | Run tests |
| `npm run type-check` | TypeScript type checking |
| `npm run clean` | Remove build artifacts and data files |
