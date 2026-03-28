# SurvAI API Workflow Diagram

## High-Level Flow

```
┌──────────────┐
│  Your App    │
│  (Client)    │
└──────┬───────┘
       │
       │ 1. Register Webhook
       ├─────────────────────────────────────────────►
       │                                               │
       │ 2. Import Survey + Questions + Answers       │
       ├─────────────────────────────────────────────►│
       │                                               │
       │ 3. Generate Code Frame (GPT-5)               │  ┌──────────────┐
       ├─────────────────────────────────────────────►│  │   SurvAI     │
       │                                               │  │   Backend    │
       │◄─────────────────────────────────────────────┤  │   + AI       │
       │   Webhook: code_frame.created                │  └──────────────┘
       │                                               │
       │ 4. Start Evaluation (GPT-4o)                 │
       ├─────────────────────────────────────────────►│
       │                                               │
       │◄── Webhook: evaluation.started ──────────────┤
       │◄── Webhook: evaluation.progress ─────────────┤
       │◄── Webhook: evaluation.completed ────────────┤
       │                                               │
       │ 5. Retrieve Results                          │
       ├─────────────────────────────────────────────►│
       │◄── Evaluated Answers with Codes ─────────────┤
       │                                               │
┌──────┴───────┐
│  Analyze &   │
│   Export     │
└──────────────┘
```

## Data Flow

```
┌─────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│  Import  │────►│ Code     │────►│ Evaluate  │────►│ Results  │
│  Survey  │     │ Frame    │     │ Answers   │     │ & Export │
│          │     │ (GPT-5)  │     │ (GPT-4o)  │     │          │
└─────────┘     └──────────┘     └───────────┘     └──────────┘
  50 answers      5-8 categories   50 coded          CSV/JSON
  1 question      2-tier hierarchy answers            reports
```

## Code Frame Structure

```
Survey: "Customer Feedback 2025"
  └─ Question: "What improvements would you like?"
      └─ Code Frame (AI-generated):
          ├─ 1. Performance & Speed
          │   ├─ 1.1 Mobile App Performance
          │   └─ 1.2 Loading Times
          ├─ 2. Features & Functionality
          │   ├─ 2.1 Integrations
          │   └─ 2.2 Search & Navigation
          ├─ 3. User Interface
          │   ├─ 3.1 Dark Mode
          │   └─ 3.2 Responsive Design
          └─ ...
```

## Evaluation Result

```
Answer: "Better mobile app performance and dark mode support"
  ├─ Coding 1: Performance & Speed > Mobile App Performance
  │   └─ Evidence: ["Better mobile app performance"]
  └─ Coding 2: User Interface > Dark Mode
      └─ Evidence: ["dark mode support"]
```

## Webhook Event Sequence

```
Time ──────────────────────────────────────────────────────►

  POST /code_frame       code_frame.created
  ─────────►             ◄─────────
       │    GPT-5 (2-5m)      │
       └─────────────────────┘

  POST /evaluate         eval.started    eval.progress    eval.completed
  ─────────►             ◄──────────     ◄──────────      ◄──────────
       │    GPT-4o (5-30m)    │              │                  │
       └──────────────────────┴──────────────┴──────────────────┘
```

## Tracking Survey Flow

For ongoing surveys where new answers arrive over time:

```
┌──────────┐     ┌───────────┐     ┌────────────────┐     ┌──────────┐
│ Initial  │────►│ Add New   │────►│ Continue       │────►│ Updated  │
│ Setup    │     │ Answers   │     │ Evaluations    │     │ Results  │
│          │     │           │     │                │     │          │
└──────────┘     └───────────┘     └────────────────┘     └──────────┘
  One-time:        POST answers      POST continue-        All answers
  Import +         to existing        evaluations           coded with
  CodeFrame +      question           (only processes       same code
  Evaluation                          new answers)          frame
```

## Application Architecture

```
src/
├─ api/client.ts ──────── SurvAI API client (typed, with interceptors)
├─ config.ts ─────────── Environment config + validation
├─ index.ts ──────────── Main workflow orchestration
│   ├─ registerWebhook()
│   ├─ importSurvey()
│   ├─ generateCodeFrame()
│   ├─ runEvaluation()
│   ├─ retrieveResults()
│   ├─ analyzeResults()
│   └─ exportResults()
├─ storage/db.ts ─────── createCollection<T> factory storage
├─ utils/
│   ├─ code-frame.ts ─── countTotalCodes(), displayCodeFrame()
│   ├─ export.ts ──────── CSV + JSON report generation
│   └─ wait.ts ────────── Webhook event polling
└─ webhook-server/
    ├─ server.ts ──────── Express receiver with signature verification
    ├─ handlers.ts ────── Event handlers (code_frame, evaluation)
    └─ signature.ts ───── HMAC SHA-256 verification
```
