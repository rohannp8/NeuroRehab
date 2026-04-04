#!/bin/bash
# NeuroRehab Backend Startup Script
# Starts the FastAPI server with proper error handling

set -e

echo "════════════════════════════════════════════════════════════════"
echo "🚀 NeuroRehab Backend Startup Script"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Navigate to backend directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/backend"

echo "📂 Working directory: $(pwd)"
echo ""

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed or not in PATH"
    exit 1
fi

echo "✅ Python found: $(python --version)"
echo ""

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    echo "⚠️  requirements.txt not found. Skipping dependency installation."
else
    echo "📦 Installing dependencies from requirements.txt..."
    pip install -r requirements.txt
    echo "✅ Dependencies installed"
    echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating with defaults..."
    cp .env.example .env 2>/dev/null || echo "GROQ_API_KEY=your_api_key_here" > .env
fi

echo "🔧 Environment configured"
echo ""

# Start the backend server
echo "🎬 Starting NeuroRehab Backend Server..."
echo "   Listening on: http://localhost:8000"
echo "   WebSocket: ws://localhost:8000/ws/pose"
echo ""

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
