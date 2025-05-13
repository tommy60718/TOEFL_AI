# AI-Powered TOEFL Writing Practice Framework 📝

A simple yet effective English learning platform for TOEFL writing practice with AI-powered feedback.

## System Architecture

This application follows a three-tier architecture:
1. Frontend (HTML/JavaScript)
2. Node.js Express Backend
3. Python FastAPI Backend with Gemini AI

Data flows from the frontend to Node.js, then to FastAPI, which processes data through Google's Gemini API and stores results in SQLite.

## Setup Instructions

### 1. Python Backend Setup

```bash
# Navigate to the Python backend directory
cd backend/python

# Install dependencies
pip install -r requirements.txt

# Create a .env file with your Gemini API key
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start the FastAPI server
python main.py
```

### 2. Node.js Backend Setup

```bash
# Navigate to the Node.js backend directory
cd backend/node

# Install dependencies
npm install

# Start the Express server
npm start
```

### 3. Access the Frontend

Open your browser and navigate to:
```
http://localhost:3000
```

## Features

- User-friendly interface for writing practice
- Real-time analysis of writing submissions
- Detailed feedback with corrections and suggestions
- TOEFL scoring based on official rubrics
- Persistent storage of submissions in SQLite

## Development

To run the servers in development mode with auto-reload:

```bash
# For Python backend
cd backend/python
python main.py

# For Node.js backend
cd backend/node
npm run dev
```

## Requirements

- Node.js 14+
- Python 3.8+
- Google Gemini API key 