# survai-api-usage

Example application demonstrating complete SurvAI API integration with AI-powered survey analysis.

## 📚 Documentation

- **[API Usage Guide](./API_USAGE_GUIDE.md)** - Comprehensive step-by-step guide with code examples
- **[Workflow Diagram](./WORKFLOW_DIAGRAM.md)** - Visual representation of the complete workflow
- **[Quick Reference](./QUICK_REFERENCE.md)** - One-page reference for common operations
- **[Implementation Plan](./IMPLEMENTATION_PLAN.md)** - Technical implementation details
- **[Setup Instructions](./SETUP.md)** - Development environment setup

## Overview

This application demonstrates the complete SurvAI API workflow:

1. **Register Webhook** - Receive real-time notifications for long-running AI operations
2. **Import Survey** - Bulk upload survey with questions and answers
3. **Generate Code Frame** - AI creates hierarchical categorization structure (GPT-5)
4. **Run Evaluation** - AI categorizes all answers using the code frame (GPT-4o)
5. **Retrieve Results** - Get coded answers with evidence (textbits)
6. **Analyze & Export** - Calculate statistics and export to CSV/JSON

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API key and webhook URL

# 3. Start ngrok (for local webhooks)
ngrok http 3000

# 4. Run the example
npm run dev
```

## Features

✅ Complete API integration example
✅ Webhook server with signature verification
✅ Real-time progress monitoring
✅ Bulk import of survey data
✅ AI code frame generation (GPT-5)
✅ AI answer evaluation (GPT-4o)
✅ **Tracking Surveys** - Continuous answer collection with incremental evaluation
✅ Results analysis and statistics
✅ CSV and JSON export
✅ Error handling and retry logic
✅ TypeScript throughout

## Examples

### Standard Workflow
Run the complete one-time survey analysis:
```bash
npm run dev
```

### Tracking Survey Workflow
Demonstrates continuous answer collection with incremental evaluation:
```bash
npm run tracking
```

The tracking survey example shows how to:
1. Create a survey with initial answers (Wave 1)
2. Generate code frame and run initial evaluation
3. Add new answers later (Wave 2)
4. Continue evaluation to process only new answers
5. Repeat for Wave 3
6. View aggregated results

**Key APIs for Tracking Surveys:**
- `createAnswers()` - Add new answers to existing questions
- `continueEvaluations()` - Resume evaluation to code only unevaluated answers
- `listEvaluations()` - View all evaluations for a question
- `listAnswers()` - View all answers for a question

This pattern is ideal for:
- Daily/weekly feedback collection
- Longitudinal research studies
- Live event feedback
- Multi-wave research projects
