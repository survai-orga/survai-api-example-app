# SurvAI API Workflow Diagram

Visual representation of the complete SurvAI API workflow demonstrated in the example application.

---

## High-Level Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SurvAI API Complete Workflow                  │
└─────────────────────────────────────────────────────────────────┘

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
           │◄─────────────────────────────────────────────┤
           │   Webhook: evaluation.started                │
           │                                               │
           │◄─────────────────────────────────────────────┤
           │   Webhook: evaluation.progress               │
           │                                               │
           │◄─────────────────────────────────────────────┤
           │   Webhook: evaluation.completed              │
           │                                               │
           │ 5. Retrieve Results                          │
           ├─────────────────────────────────────────────►│
           │                                               │
           │◄─────────────────────────────────────────────┤
           │   Evaluated Answers with Codes               │
           │                                               │
    ┌──────┴───────┐
    │  Analyze &   │
    │   Export     │
    └──────────────┘
```

---

## Detailed Step-by-Step Flow

### Step 1: Setup & Authentication

```
┌─────────────────┐
│  Configuration  │
│  - API Key      │
│  - Base URL     │
│  - Webhook URL  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Initialize      │
│ API Client      │
│ with Auth       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Start Webhook  │
│  Server         │
│  (localhost:3000)│
└─────────────────┘
```

**What happens:**
- Load environment variables (API key, URLs)
- Create HTTP client with authentication headers
- Start Express server to receive webhook notifications

**Key Components:**
- `.env` file with configuration
- `SurvAIClient` class for API communication
- Express server on port 3000

---

### Step 2: Register Webhook

```
┌─────────────────┐
│   Your App      │
└────────┬────────┘
         │
         │ POST /api/v1/webhooks
         │ {
         │   url: "https://your-app.ngrok.io/webhooks/survai",
         │   events: ["code_frame.created", ...]
         │ }
         │
         ▼
┌─────────────────┐
│  SurvAI API     │
│  - Validate URL │
│  - Create record│
│  - Generate     │
│    secret       │
└────────┬────────┘
         │
         │ Response:
         │ {
         │   webhook: {
         │     id: "2rlhFj...",
         │     secret: "whsec_..."
         │   }
         │ }
         │
         ▼
┌─────────────────┐
│  Save Secret    │
│  for Signature  │
│  Verification   │
└─────────────────┘
```

**What happens:**
1. Client sends webhook registration request
2. SurvAI validates the URL and creates webhook record
3. Server generates unique secret for HMAC signatures
4. Client stores secret for verifying incoming webhooks

**Key Data:**
- Webhook ID: `2rlhFjQLqTO6cycrb4e0`
- Secret: `whsec_BeBpYl-hW...` (used for signatures)
- Subscribed events list

---

### Step 3: Import Survey Data

```
┌─────────────────────────────────────────────────────────┐
│                  Import Request                          │
│                                                          │
│  POST /api/v1/surveys/import                            │
│  {                                                       │
│    surveyData: {                                        │
│      name: "Customer Feedback Survey 2025",             │
│      questions: [{                                      │
│        question_text: "What improvements...",           │
│        answers: [                                       │
│          { customer_id: "001", answer_text: "..." },    │
│          { customer_id: "002", answer_text: "..." },    │
│          ...                                            │
│        ]                                                │
│      }]                                                 │
│    }                                                    │
│  }                                                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │      SurvAI Database          │
         │                               │
         │  ┌──────────────────────┐    │
         │  │ Survey               │    │
         │  │ - ID: KZgOPq...      │    │
         │  │ - Name: Customer...   │    │
         │  └──────────┬───────────┘    │
         │             │                 │
         │  ┌──────────▼───────────┐    │
         │  │ Question             │    │
         │  │ - ID: YMyt9h...      │    │
         │  │ - Text: What...      │    │
         │  └──────────┬───────────┘    │
         │             │                 │
         │  ┌──────────▼───────────┐    │
         │  │ Answers (50)         │    │
         │  │ - cust_001: "..."    │    │
         │  │ - cust_002: "..."    │    │
         │  │ - ...                │    │
         │  └──────────────────────┘    │
         └───────────────────────────────┘
                         │
                         │ Response:
                         │ {
                         │   surveyId: "KZgOPqQz...",
                         │   message: "...50 answer(s)"
                         │ }
                         │
                         ▼
         ┌───────────────────────────────┐
         │  Survey Created Successfully   │
         │  - Survey ID stored            │
         │  - Question ID stored          │
         │  - Ready for code frame        │
         └───────────────────────────────┘
```

**What happens:**
1. Client sends bulk import with survey, question, and all answers
2. SurvAI creates database records for each entity
3. Returns survey ID and question ID for subsequent operations
4. All 50 answers now stored and ready for AI processing

**Database Structure:**
```
surveys/
  └─ KZgOPqQz0YfcA8elN1nr/
      ├─ name: "Customer Feedback Survey 2025"
      ├─ created: "2025-01-15T10:30:00Z"
      └─ questions/
          └─ YMyt9huiRy7XdSVn320a/
              ├─ question_text: "What improvements..."
              └─ answers/
                  ├─ ans_001: { customer_id, answer_text }
                  ├─ ans_002: { customer_id, answer_text }
                  └─ ... (48 more)
```

---

### Step 4: Generate Code Frame with GPT-5

```
┌─────────────────────────────────────────────────────────┐
│              Code Frame Generation Request               │
│                                                          │
│  POST /api/v1/surveys/{surveyId}/questions/{qId}/code_frame│
│  {                                                       │
│    additionalInstruction: "Create 2-tier...",           │
│    tierCount: 2                                         │
│  }                                                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │    Queue Job                  │
         │    - Job ID: 10               │
         │    - Status: queued           │
         │    - Model: GPT-5             │
         └───────────┬───────────────────┘
                     │
                     │ Response:
                     │ { jobId: 10, status: "queued" }
                     │
                     ▼
         ┌───────────────────────────────┐
         │   Background Processing       │
         │                               │
         │   GPT-5 Analyzes:             │
         │   1. Read all 50 answers      │
         │   2. Identify themes          │
         │   3. Create hierarchy         │
         │   4. Generate categories      │
         │                               │
         │   ⏱  Duration: 2-5 minutes    │
         └───────────┬───────────────────┘
                     │
                     │ Webhook Notification
                     │
                     ▼
         ┌───────────────────────────────────────────────┐
         │  Webhook Event: code_frame.created            │
         │                                               │
         │  POST https://your-app.ngrok.io/webhooks      │
         │  Headers:                                     │
         │    X-SurvAI-Signature: t=...,v1=...          │
         │    X-SurvAI-Delivery-ID: delivery_...        │
         │                                               │
         │  Body:                                        │
         │  {                                            │
         │    event: "code_frame.created",               │
         │    timestamp: "2025-01-15T10:35:42Z",         │
         │    data: {                                    │
         │      questionId: "YMyt9h...",                 │
         │      codeFrame: [                             │
         │        {                                      │
         │          id: "1",                             │
         │          name: "Performance & Speed",         │
         │          tier: 0,                             │
         │          children: [                          │
         │            {                                  │
         │              id: "1.1",                       │
         │              name: "Mobile App Performance",  │
         │              tier: 1                          │
         │            },                                 │
         │            ...                                │
         │          ]                                    │
         │        },                                     │
         │        {                                      │
         │          id: "2",                             │
         │          name: "Features & Functionality",    │
         │          tier: 0,                             │
         │          children: [...]                      │
         │        },                                     │
         │        ...                                    │
         │      ]                                        │
         │    }                                          │
         │  }                                            │
         └───────────────────────┬───────────────────────┘
                                 │
                                 ▼
                 ┌───────────────────────────────┐
                 │  Your Webhook Server          │
                 │  1. Verify signature          │
                 │  2. Store event               │
                 │  3. Notify main app           │
                 │  4. Return 200 OK             │
                 └───────────────────────────────┘
```

**Code Frame Structure:**
```
Performance & Speed                     ← Tier 0 (Main Category)
  ├─ Mobile App Performance             ← Tier 1 (Subcategory)
  ├─ Loading Times                      ← Tier 1
  └─ Server Response Time               ← Tier 1

Features & Functionality                ← Tier 0
  ├─ Integrations                       ← Tier 1
  ├─ Search & Navigation                ← Tier 1
  └─ Data Export Options                ← Tier 1

User Interface                          ← Tier 0
  ├─ Dark Mode                          ← Tier 1
  ├─ Responsive Design                  ← Tier 1
  └─ Accessibility Features             ← Tier 1

... (more categories)
```

**What happens:**
1. Client triggers code frame generation job
2. SurvAI queues job and returns immediately (async)
3. GPT-5 processes all answers in background (2-5 minutes)
4. AI creates hierarchical category structure
5. Webhook notification sent when complete
6. Your app receives and verifies webhook
7. Code frame now available for evaluation

---

### Step 5: Start Answer Evaluation with GPT-4o

```
┌─────────────────────────────────────────────────────────┐
│              Evaluation Request                          │
│                                                          │
│  POST /api/v1/surveys/{surveyId}/questions/{qId}/evaluate│
│  {                                                       │
│    evaluationName: "Initial Evaluation",                │
│    additionalInstructionEvaluation: "Be precise..."     │
│  }                                                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │    Create Evaluation          │
         │    - ID: eval_abc123          │
         │    - Status: started          │
         │    - Total: 50 answers        │
         └───────────┬───────────────────┘
                     │
                     │ Response:
                     │ { evaluationId: "eval_abc123" }
                     │
                     ▼
         ┌───────────────────────────────┐
         │  Queue 50 Processing Jobs     │
         │  (One per answer)             │
         │                               │
         │  Job 1: Answer "Better..."    │
         │  Job 2: Answer "More..."      │
         │  ...                          │
         │  Job 50: Answer "Improved..." │
         └───────────┬───────────────────┘
                     │
                     │ Webhook: evaluation.started
                     │
                     ▼
         ┌───────────────────────────────────────────────┐
         │   Background Processing (GPT-4o)              │
         │                                               │
         │   For Each Answer:                            │
         │   ┌─────────────────────────────────────┐    │
         │   │ 1. Read answer text                 │    │
         │   │ 2. Read code frame                  │    │
         │   │ 3. GPT-4o analyzes                  │    │
         │   │ 4. Assign relevant codes            │    │
         │   │ 5. Extract text evidence            │    │
         │   │ 6. Save coding result               │    │
         │   └─────────────────────────────────────┘    │
         │                                               │
         │   Progress Updates:                           │
         │   ├─ 10 processed → webhook (20%)             │
         │   ├─ 25 processed → webhook (50%)             │
         │   ├─ 40 processed → webhook (80%)             │
         │   └─ 50 processed → webhook (100%)            │
         │                                               │
         │   ⏱  Duration: 5-10 minutes                   │
         └───────────────────────┬───────────────────────┘
                                 │
                                 │ Webhooks (multiple)
                                 │
                                 ▼
         ┌───────────────────────────────────────────────┐
         │  Webhook Events Timeline                      │
         │                                               │
         │  T+0s:  evaluation.started                    │
         │         { totalAnswers: 50 }                  │
         │                                               │
         │  T+2m:  evaluation.progress                   │
         │         { processedAnswers: 10, progress: 20% }│
         │                                               │
         │  T+5m:  evaluation.progress                   │
         │         { processedAnswers: 25, progress: 50% }│
         │                                               │
         │  T+8m:  evaluation.progress                   │
         │         { processedAnswers: 40, progress: 80% }│
         │                                               │
         │  T+10m: evaluation.completed                  │
         │         { processedAnswers: 50, progress: 100% }│
         └───────────────────────┬───────────────────────┘
                                 │
                                 ▼
                 ┌───────────────────────────────┐
                 │  All Answers Coded            │
                 │  - Ready to retrieve          │
                 │  - Results in database        │
                 └───────────────────────────────┘
```

**What happens:**
1. Client starts evaluation job
2. SurvAI creates 50 individual processing jobs (one per answer)
3. Each job runs GPT-4o to analyze answer against code frame
4. Progress webhooks sent periodically (every ~20% completion)
5. AI assigns category codes with text evidence (textbits)
6. Final webhook sent when all answers processed

**Processing Flow Per Answer:**
```
Answer: "Better mobile app performance and dark mode support"
                    ↓
          ┌─────────────────┐
          │     GPT-4o      │
          │   + Code Frame  │
          └────────┬────────┘
                   ↓
        Assigned Codes:
        ┌─────────────────────────────────────────┐
        │ Code 1:                                 │
        │   path: "Performance & Speed >          │
        │          Mobile App Performance"        │
        │   textbits: ["Better mobile app         │
        │              performance"]              │
        │   tier: 1                               │
        │                                         │
        │ Code 2:                                 │
        │   path: "User Interface > Dark Mode"    │
        │   textbits: ["dark mode support"]       │
        │   tier: 1                               │
        └─────────────────────────────────────────┘
                   ↓
           Stored in Database
```

---

### Step 6: Retrieve Evaluation Results

```
┌─────────────────────────────────────────────────────────┐
│              Results Request                             │
│                                                          │
│  GET /api/v1/surveys/{surveyId}/questions/{qId}/        │
│      evaluations/{evaluationId}                          │
│                                                          │
│  Optional params:                                        │
│  - exclude=answers  (get metadata only)                 │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  SurvAI Database Query        │
         │                               │
         │  1. Get evaluation metadata   │
         │  2. Get all coded answers     │
         │  3. Join with original texts  │
         │  4. Format response           │
         └───────────┬───────────────────┘
                     │
                     │ Response (50 coded answers)
                     │
                     ▼
         ┌─────────────────────────────────────────────┐
         │  Evaluation Results                          │
         │                                              │
         │  {                                           │
         │    evaluation: {                             │
         │      id: "eval_abc123",                      │
         │      name: "Initial Evaluation",             │
         │      totalAnswers: 50,                       │
         │      processedAnswers: 50,                   │
         │      is_completed: true                      │
         │    },                                        │
         │    evaluatedAnswers: [                       │
         │      {                                       │
         │        id: "evAnswer_001",                   │
         │        answerId: "ans_customer_001",         │
         │        answer_text: "Better mobile...",      │
         │        codings: [                            │
         │          {                                   │
         │            code_path: "Performance...",      │
         │            textbits: ["Better mobile..."],   │
         │            tier: 1                           │
         │          },                                  │
         │          {                                   │
         │            code_path: "User Interface...",   │
         │            textbits: ["dark mode..."],       │
         │            tier: 1                           │
         │          }                                   │
         │        ]                                     │
         │      },                                      │
         │      ... (49 more answers)                   │
         │    ]                                         │
         │  }                                           │
         └──────────────────┬──────────────────────────┘
                            │
                            ▼
         ┌─────────────────────────────────┐
         │  Your App Processes Results     │
         │                                 │
         │  - Calculate statistics         │
         │  - Count code frequencies       │
         │  - Generate reports             │
         │  - Export to CSV/JSON           │
         └─────────────────────────────────┘
```

**Response Data Structure:**
```
evaluatedAnswers: [
  {
    answer_text: "Better mobile app performance and dark mode support",
    codings: [
      {
        code_path: "Performance & Speed > Mobile App Performance",
        textbits: ["Better mobile app performance"],
        tier: 1
      },
      {
        code_path: "User Interface > Dark Mode",
        textbits: ["dark mode support"],
        tier: 1
      }
    ]
  },
  {
    answer_text: "More integrations with third-party tools",
    codings: [
      {
        code_path: "Features & Functionality > Integrations",
        textbits: ["integrations with third-party tools"],
        tier: 1
      }
    ]
  },
  ... (48 more)
]
```

---

### Step 7: Analysis & Export

```
┌─────────────────────────────────────────────────────────┐
│           Analyze Coded Answers                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  Calculate Statistics         │
         │                               │
         │  - Total answers: 50          │
         │  - Successfully coded: 50     │
         │  - Total codings: 87          │
         │  - Avg codings/answer: 1.74   │
         │                               │
         │  Top Categories:              │
         │  ├─ Perf > Mobile: 15 (30%)   │
         │  ├─ Features > Integ: 12 (24%)│
         │  ├─ UI > Dark Mode: 10 (20%)  │
         │  └─ ...                       │
         └───────────┬───────────────────┘
                     │
                     ├──► Export to CSV
                     │    ┌────────────────────────────┐
                     │    │ results.csv                │
                     │    ├────────────────────────────┤
                     │    │ Answer ID | Text | Codes   │
                     │    │ ans_001   | ...  | Perf... │
                     │    │ ans_002   | ...  | Feat... │
                     │    │ ...                        │
                     │    └────────────────────────────┘
                     │
                     ├──► Generate JSON Report
                     │    ┌────────────────────────────┐
                     │    │ evaluation_report.json     │
                     │    ├────────────────────────────┤
                     │    │ {                          │
                     │    │   survey: {...},           │
                     │    │   statistics: {...},       │
                     │    │   topCategories: [...],    │
                     │    │   allAnswers: [...]        │
                     │    │ }                          │
                     │    └────────────────────────────┘
                     │
                     └──► Visualization Data
                          ┌────────────────────────────┐
                          │ - Category distribution    │
                          │ - Frequency charts         │
                          │ - Code co-occurrence       │
                          │ - Hierarchical treemap     │
                          └────────────────────────────┘
```

---

## Webhook Signature Verification Flow

**Critical security step to prevent spoofed webhooks:**

```
┌─────────────────────────────────────────────────────────┐
│          Incoming Webhook Request                        │
│                                                          │
│  POST /webhooks/survai                                   │
│  Headers:                                                │
│    X-SurvAI-Signature: t=1705318560,v1=abc123...        │
│    X-SurvAI-Delivery-ID: delivery_xyz789                │
│                                                          │
│  Body:                                                   │
│    { event: "evaluation.completed", ... }               │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  Extract Components           │
         │                               │
         │  timestamp = 1705318560       │
         │  signature = abc123...        │
         │  payload = { event: ... }     │
         └───────────┬───────────────────┘
                     │
                     ▼
         ┌───────────────────────────────┐
         │  Compute Expected Signature   │
         │                               │
         │  signedPayload =              │
         │    "${timestamp}.${payload}"  │
         │                               │
         │  expectedSig = HMAC-SHA256(   │
         │    secret,                    │
         │    signedPayload              │
         │  )                            │
         └───────────┬───────────────────┘
                     │
                     ▼
         ┌───────────────────────────────┐
         │  Timing-Safe Comparison       │
         │                               │
         │  crypto.timingSafeEqual(      │
         │    Buffer.from(signature),    │
         │    Buffer.from(expectedSig)   │
         │  )                            │
         └───────────┬───────────────────┘
                     │
                     ├──► ✓ Match → Process Event
                     │
                     └──► ✗ Mismatch → Reject (401)
```

---

## Error Handling & Retry Flow

### Code Frame Generation Failure

```
┌─────────────────────────────────┐
│  POST .../code_frame            │
└─────────────┬───────────────────┘
              │
              ▼
      ┌───────────────┐
      │  GPT-5 Error  │
      │  - Timeout    │
      │  - API Error  │
      │  - Bad Data   │
      └───────┬───────┘
              │
              │ Webhook Notification
              │
              ▼
┌─────────────────────────────────────────┐
│  Webhook: code_frame.failed             │
│                                         │
│  {                                      │
│    event: "code_frame.failed",          │
│    data: {                              │
│      questionId: "...",                 │
│      error: "OpenAI API timeout",       │
│      retryable: true                    │
│    }                                    │
│  }                                      │
└─────────────┬───────────────────────────┘
              │
              ▼
      ┌───────────────────────┐
      │  Your App Decision    │
      │  - Log error          │
      │  - Notify user        │
      │  - Retry with         │
      │    different params?  │
      └───────────────────────┘
```

### Evaluation Failure (Partial)

```
Evaluation Progress:
├─ Answers 1-40: ✓ Success
├─ Answer 41: ✗ Failed (GPT-4o error)
├─ Answers 42-50: ✓ Success

Result:
├─ Webhook: evaluation.completed
│   { processedAnswers: 49, totalAnswers: 50 }
│
└─ 49 answers successfully coded
    1 answer requires retry
```

---

## Rate Limiting & Backoff

```
┌─────────────────────────────────┐
│  API Request                    │
└─────────────┬───────────────────┘
              │
              ▼
      ┌───────────────┐
      │  Rate Limit   │
      │  Exceeded     │
      │  60/minute    │
      └───────┬───────┘
              │
              │ Response: 429 Too Many Requests
              │ Header: Retry-After: 60
              │
              ▼
┌─────────────────────────────────────┐
│  Client Exponential Backoff         │
│                                     │
│  Attempt 1: Wait 60s (from header)  │
│  Attempt 2: Wait 120s               │
│  Attempt 3: Wait 240s               │
│  Max retries: 3                     │
└─────────────────────────────────────┘
```

---

## Data Flow Summary

```
┌──────────────┐
│ Raw Survey   │  50 customer answers
│ Data         │  "Better mobile app...", "More integrations..."
└──────┬───────┘
       │
       │ Import
       │
       ▼
┌──────────────┐
│ SurvAI       │  Survey + Question + 50 Answers
│ Database     │  Stored and indexed
└──────┬───────┘
       │
       │ GPT-5 Analysis
       │
       ▼
┌──────────────┐
│ Code Frame   │  Hierarchical categories
│ (AI-Generated│  "Performance > Mobile App", "Features > Integrations"
└──────┬───────┘
       │
       │ GPT-4o Coding
       │
       ▼
┌──────────────┐
│ Coded        │  Each answer assigned to categories
│ Answers      │  With text evidence (textbits)
└──────┬───────┘
       │
       │ Analysis
       │
       ▼
┌──────────────┐
│ Insights     │  Statistics, top categories, trends
│ & Reports    │  CSV exports, visualizations
└──────────────┘
```

---

## Summary

This diagram illustrates:

1. **Sequential Flow**: Each step depends on previous completion
2. **Async Operations**: Code frame and evaluation run in background
3. **Webhook Notifications**: Real-time updates without polling
4. **Data Transformation**: Raw text → Categories → Insights
5. **Error Handling**: Graceful failures with retry options
6. **Security**: HMAC signature verification for webhooks

**Total Time**: ~15-20 minutes for complete workflow (50 answers)
- Setup: ~1 minute
- Code frame: 2-5 minutes
- Evaluation: 5-10 minutes
- Analysis: 1-2 minutes

**Key Success Factors**:
- Reliable webhook endpoint (ngrok for local dev)
- Proper signature verification
- Error handling and retries
- Progress monitoring via webhooks
