#!/bin/bash

# SurvAI API Example - Quick Setup Script
# This script helps you get started quickly

set -e

echo "======================================================================="
echo "SurvAI API Example - Quick Setup"
echo "======================================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the survai-api-usage directory"
    exit 1
fi

# Step 1: Install dependencies
echo "Step 1: Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Step 2: Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Step 2: Creating .env file..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: You need to configure .env with your credentials:"
    echo "   1. Open .env in your editor"
    echo "   2. Set SURVAI_API_KEY (get from SurvAI UI)"
    echo "   3. Start ngrok: ngrok http 3000"
    echo "   4. Set WEBHOOK_BASE_URL to your ngrok URL"
    echo ""
    echo "After configuring .env, run: npm run dev"
    echo ""
else
    echo "Step 2: .env file already exists"
    echo ""
fi

# Step 3: Create data directory
echo "Step 3: Creating data directory..."
mkdir -p data/export
echo "✓ Data directory created"
echo ""

# Step 4: Create logs directory
echo "Step 4: Creating logs directory..."
mkdir -p logs
echo "✓ Logs directory created"
echo ""

echo "======================================================================="
echo "Setup Complete!"
echo "======================================================================="
echo ""
echo "Next steps:"
echo "  1. Configure .env with your SurvAI API key"
echo "  2. Start ngrok: ngrok http 3000"
echo "  3. Update WEBHOOK_BASE_URL in .env with ngrok URL"
echo "  4. Run the example: npm run dev"
echo ""
echo "Documentation:"
echo "  - README.md - User guide"
echo "  - IMPLEMENTATION_STATUS.md - Quick start guide"
echo "  - IMPLEMENTATION_PLAN.md - Technical details"
echo ""
