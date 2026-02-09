# Setup Instructions

## What's Been Created

I've set up the complete project structure for the SurvAI API example application:

### ✅ Completed Files

1. **`IMPLEMENTATION_PLAN.md`** - Comprehensive 750+ line implementation guide
   - Complete workflow steps (Phases 1-6)
   - API client implementation examples
   - Webhook server architecture
   - Main orchestration script outline
   - Sample data structure
   - Timeline and success criteria

2. **`package.json`** - Node.js project configuration
   - Dependencies: axios, express, dotenv, csv-writer, winston
   - Dev dependencies: TypeScript, tsx, vitest
   - Scripts: dev, build, start, webhook, test

3. **`tsconfig.json`** - TypeScript configuration
   - ES2022 target with ESNext modules
   - Strict mode enabled
   - Source maps and declarations

4. **`.env.example`** - Environment variables template
   - API configuration (base URL, API key, Firebase token)
   - Webhook settings (port, base URL, secret)
   - Logging and storage paths

5. **`.gitignore`** - Git ignore patterns
   - node_modules, dist, logs
   - data/*.json (local storage)
   - .env (sensitive credentials)

6. **`src/config.ts`** - Configuration management
   - Loads environment variables
   - Validates required settings
   - Exports typed CONFIG object

7. **`src/examples/sample-data.ts`** - Sample survey data
   - 50 realistic product feedback answers
   - Ready to use for testing

8. **`src/api/client.ts`** - SurvAI API client (280+ lines)
   - Complete TypeScript interface definitions
   - Axios-based HTTP client with interceptors
   - All API endpoints implemented:
     - Survey CRUD operations
     - Question operations
     - Batch answer uploads
     - Code frame generation
     - Evaluation operations
     - Webhook management
   - Request/response logging
   - Error handling

9. **`src/webhook-server/signature.ts`** - HMAC signature verification
   - Secure webhook validation
   - Timing-safe comparison

10. **`README.md`** - User-facing documentation (updated)
    - Quick start guide
    - Configuration instructions
    - How it works explanation
    - Troubleshooting section
    - API reference

## Next Steps

### 1. Install Dependencies

```bash
cd survai-api-usage
npm install
```

This will install:
- `axios` - HTTP client for API calls
- `express` - Web server for webhooks
- `dotenv` - Environment variable management
- `csv-writer` - Export to CSV
- `winston` - Structured logging
- TypeScript and development tools

### 2. Create Remaining Core Files

You still need to implement:

#### High Priority (Required for basic functionality):

**`src/webhook-server/server.ts`** (~80 lines)
- Express server listening on configured port
- POST endpoint for webhook delivery
- Signature verification
- Event handler delegation
- Health check endpoint

**`src/webhook-server/handlers.ts`** (~120 lines)
- Handle each webhook event type
- Update local storage
- Log progress
- Notify main application

**`src/storage/db.ts`** (~200 lines)
- Simple JSON file database
- CRUD operations for all entities
- File locking for concurrent access
- Auto-create data directory

**`src/utils/wait.ts`** (~100 lines)
- Wait for webhook events with timeout
- Poll for evaluation completion (fallback)
- Promise-based async helpers

**`src/index.ts`** (~300 lines)
- Main orchestration script
- Complete workflow implementation
- Progress logging
- Result analysis

#### Medium Priority (Nice to have):

**`src/utils/logger.ts`** (~80 lines)
- Winston logger configuration
- File and console output
- Structured logging

**`src/utils/export.ts`** (~150 lines)
- Export to CSV with csv-writer
- Generate JSON reports
- Format results for analysis

**`src/storage/models.ts`** (~50 lines)
- Additional TypeScript interfaces
- Helper functions for data transformation

#### Low Priority (Optional enhancements):

**`src/examples/scenarios/basic-flow.ts`**
- Minimal example without webhooks
- Useful for quick testing

**`src/examples/scenarios/batch-answers.ts`**
- Large-scale answer processing demo
- Shows pagination and rate limiting

**`src/examples/scenarios/multi-question.ts`**
- Multiple questions in one survey
- More complex evaluation workflow

**`tests/*.test.ts`**
- Unit tests with Vitest
- Integration tests for API calls

### 3. Configure Environment

```bash
# Copy example to actual .env
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Set these required variables:
- `SURVAI_API_BASE_URL` - Your SurvAI instance URL
- `SURVAI_API_KEY` - Your API key (or Firebase token)
- `WEBHOOK_BASE_URL` - Your public webhook URL (use ngrok for local dev)

### 4. Set Up ngrok (for local development)

```bash
# Install ngrok
brew install ngrok  # macOS
# OR
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Set WEBHOOK_BASE_URL in .env
```

### 5. Development Workflow

Once all files are implemented:

```bash
# Terminal 1: Start ngrok
ngrok http 3000

# Terminal 2: Run the example
npm run dev
```

Expected output:
```
============================================================
SurvAI API Example Application
============================================================

Step 1: Starting webhook server...
✓ Webhook server listening on port 3000
  Endpoint: https://abc123.ngrok.io/webhooks/survai

Step 2: Initializing API client...
✓ Configuration validated

Step 3: Registering webhook...
→ POST /api/v1/webhooks
← 201 /api/v1/webhooks
✓ Webhook registered: wh_123

Step 4: Creating survey...
→ POST /api/v1/surveys
← 201 /api/v1/surveys
✓ Survey created: survey_123

... (continues through all 10 steps)
```

## Implementation Timeline

Based on the plan:

### Day 1 (Core Infrastructure) - 6-8 hours
- ✅ Project setup, package.json, tsconfig
- ✅ API client with all endpoints
- ✅ Configuration management
- ⏳ Storage layer (db.ts)
- ⏳ Webhook signature verification

### Day 2 (Webhook System) - 6-8 hours
- ⏳ Webhook server (server.ts)
- ⏳ Event handlers (handlers.ts)
- ⏳ Wait utilities (wait.ts)
- ⏳ Testing webhook delivery

### Day 3 (Main Application) - 6-8 hours
- ⏳ Main orchestration script (index.ts)
- ⏳ Result analysis functions
- ⏳ Progress logging
- ⏳ Error handling

### Day 4 (Export & Polish) - 4-6 hours
- ⏳ CSV export functionality
- ⏳ JSON report generation
- ⏳ Logger implementation
- ⏳ Documentation refinement

### Day 5 (Testing & Examples) - 4-6 hours
- ⏳ End-to-end testing
- ⏳ Alternative scenario examples
- ⏳ Troubleshooting guide
- ⏳ Code cleanup

**Status**: ~30% complete
- Project structure: ✅ Complete
- API client: ✅ Complete
- Configuration: ✅ Complete
- Documentation: ✅ Complete
- Core implementation: ⏳ Pending
- Testing: ⏳ Pending

## Quick Reference

### Key Files

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `IMPLEMENTATION_PLAN.md` | Complete technical guide | 750 | ✅ Done |
| `README.md` | User documentation | 350 | ✅ Done |
| `src/api/client.ts` | API client with all endpoints | 280 | ✅ Done |
| `src/config.ts` | Configuration management | 60 | ✅ Done |
| `src/webhook-server/signature.ts` | Signature verification | 35 | ✅ Done |
| `src/webhook-server/server.ts` | Webhook Express server | 80 | ⏳ TODO |
| `src/webhook-server/handlers.ts` | Event handlers | 120 | ⏳ TODO |
| `src/storage/db.ts` | JSON file database | 200 | ⏳ TODO |
| `src/utils/wait.ts` | Async wait helpers | 100 | ⏳ TODO |
| `src/index.ts` | Main orchestration | 300 | ⏳ TODO |

### Commands

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run built version
npm start

# Run only webhook server
npm run webhook

# Type check without building
npm run type-check

# Clean generated files
npm run clean
```

### File Structure

```
survai-api-usage/
├── ✅ IMPLEMENTATION_PLAN.md    # 750-line technical guide
├── ✅ README.md                 # User documentation
├── ✅ package.json              # Dependencies
├── ✅ tsconfig.json             # TypeScript config
├── ✅ .env.example              # Environment template
├── ✅ .gitignore                # Git ignore rules
├── ⏳ .env                      # Your credentials (create this)
├── src/
│   ├── ✅ config.ts             # Configuration
│   ├── ⏳ index.ts              # Main script (TODO)
│   ├── api/
│   │   └── ✅ client.ts         # Complete API client
│   ├── webhook-server/
│   │   ├── ⏳ server.ts         # Express server (TODO)
│   │   ├── ⏳ handlers.ts       # Event handlers (TODO)
│   │   └── ✅ signature.ts      # HMAC verification
│   ├── storage/
│   │   ├── ⏳ db.ts             # JSON database (TODO)
│   │   └── ⏳ models.ts         # Data models (TODO)
│   ├── utils/
│   │   ├── ⏳ logger.ts         # Logging (TODO)
│   │   ├── ⏳ wait.ts           # Async helpers (TODO)
│   │   └── ⏳ export.ts         # CSV export (TODO)
│   └── examples/
│       ├── ✅ sample-data.ts    # 50 sample answers
│       └── scenarios/
│           ├── ⏳ basic-flow.ts    (Optional)
│           ├── ⏳ batch-answers.ts (Optional)
│           └── ⏳ multi-question.ts (Optional)
├── data/                        # JSON storage (gitignored)
└── logs/                        # Application logs (gitignored)
```

## Getting Help

1. **Implementation Guide**: See `IMPLEMENTATION_PLAN.md` for detailed code examples
2. **API Reference**: See `src/api/client.ts` for all available methods
3. **Configuration**: See `.env.example` for all environment variables
4. **Workflow**: See `IMPLEMENTATION_PLAN.md` sections for each phase

## Resources

- **SurvAI API Docs**: `../app/src/lib/openapi/spec.ts`
- **Webhook Guide**: `../docs/WEBHOOK_IMPLEMENTATION.md`
- **API Plan**: `../docs/API_PROGRAMMATIC_ACCESS_PLAN.md`
- **Architecture**: `../.github/copilot-instructions.md`
