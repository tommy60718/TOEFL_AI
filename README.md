# Write Track Lite - AI-Powered Personalized English Writing Platform 🎯

A comprehensive English writing learning platform that personalizes your learning journey through AI-powered assessment, learning path generation, and intelligent practice feedback.

## 🚀 Features

### **Core Learning Journey**
- **Smart Assessment**: 4-step proficiency evaluation with AI analysis
- **Personalized Learning Plans**: AI-generated 7-day improvement plans
- **Adaptive Practice**: Context-aware question selection and feedback
- **Progress Dashboard**: Unified view of your learning journey

### **AI-Powered Intelligence**
- **Writing Analysis**: Professional-grade feedback using Google Gemini AI
- **Weakness Detection**: Identifies specific areas for improvement
- **Personalized Recommendations**: Tailored suggestions based on your profile
- **Smart Question Selection**: Prompts matched to your skill level and weak areas

## 🏗️ System Architecture

```
Frontend (HTML/CSS/JS)
      ↓
Node.js Express Server (API Gateway)
      ↓  
Python FastAPI Backend (AI Processing)
      ↓
Google Gemini AI + SQLite Database
```

**Data Flow Example:**
```
User writes essay → Node.js → FastAPI → Gemini AI → Analysis → Database → User Dashboard
```

## 📁 Project Structure

```
Write Track Lite/
├── frontend/
│   ├── index.html              # Main practice interface
│   ├── assessment.html         # 4-step assessment flow
│   ├── dashboard.html          # User progress overview
│   └── writepath/
│       └── plan.html          # 7-day learning plan view
├── backend/
│   ├── node/
│   │   ├── package.json       # Node.js dependencies
│   │   └── server.js          # Express API gateway
│   └── python/
│       ├── requirements.txt   # Python dependencies
│       └── main.py            # FastAPI + AI processing
└── docs/                      # Documentation
```

## 🛠️ Complete Setup Guide

### 📋 Prerequisites

**Required Software:**
- **Node.js**: Version 14.0 or higher ([Download](https://nodejs.org/))
- **Python**: Version 3.8 or higher ([Download](https://python.org/downloads/))
- **Git**: For cloning the repository ([Download](https://git-scm.com/))
- **Google Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)


### 🚀 Installation Steps

#### 1. Clone the Project

```bash
git clone <repository-url>
cd TOEFL_Learning
```

#### 2. Python Backend Setup

```bash
# Navigate to Python backend
cd backend/python

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
echo "GEMINI_API_KEY=your_actual_gemini_api_key_here" > .env

# Test the backend
python main.py
```

**Expected Output:**
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
Database initialized successfully!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### 3. Node.js Backend Setup

**Open a new terminal window/tab:**

```bash
# Navigate to Node.js backend
cd backend/node

# Install dependencies
npm install

# Start the server
npm start
```

**Expected Output:**
```
TOEFL Writing Practice server running on port 3000
```

#### 4. Verify Setup

**Test the complete system:**

1. **Open your browser** and navigate to: `http://localhost:3000/assessment.html`
1-2. Use ChatGPT to generate your own answer and submit it to the system.
2. **Check API health**: `http://localhost:3000/api/health` (Under development)
3. **Check Python backend**: `http://localhost:8000/docs` (FastAPI documentation)

### 🔧 Development Mode

For development with auto-reload:

```bash
# Terminal 1: Python backend with auto-reload
cd backend/python
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Node.js backend with auto-reload
cd backend/node
npm run dev
```

### 🌐 Getting Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key
5. Add it to your `.env` file in `backend/python/`


### 🔍 Troubleshooting

**Common Issues:**

1. **Port already in use:**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   # Kill process on port 8000
   lsof -ti:8000 | xargs kill -9
   ```

2. **Gemini API errors:**
   - Verify API key is correct in `.env` file
   - Check API quotas in Google Console
   - Ensure billing is enabled for your Google account


### 🎯 Complete User Journey

**Recommended Testing Flow:**
1. **Assessment**: `http://localhost:3000/assessment.html`
2. **Dashboard**: `http://localhost:3000/dashboard.html`
3. **Learning Plan**: `http://localhost:3000/writepath/plan.html`
4. **Practice**: `http://localhost:3000/index.html`

## 💫 User Experience Flow

```
Assessment (Proficiency Evaluation)
        ↓
Dashboard (Progress Overview)
        ↓
Learning Plan (7-Day Structure)
        ↓
Practice Sessions (Personalized Questions)
        ↓
Feedback & Improvement
```

## 🗄️ Database Schema

**6 Core Tables:**
- `user_profiles` - User preferences and goals
- `assessment_results` - AI analysis and proficiency scores
- `learning_paths` - Personalized 7-day plans
- `practice_sessions` - User practice history
- `questions_bank` - Curated writing prompts
- `submissions` - Writing samples and feedback

## 🤖 AI Integration

**Google Gemini Powers:**
- Writing assessment and scoring
- Learning plan generation
- Personalized feedback delivery
- Weakness pattern analysis

## 🎯 Key APIs

```javascript
// Assessment Flow
POST /api/writepath/profile        # Create user profile
POST /api/writepath/assess         # AI assessment
GET  /api/writepath/results/:id    # Get results

// Learning Path  
POST /api/writepath/generate-plan  # Create learning plan
GET  /api/writepath/plan/:id       # View plan
PUT  /api/writepath/plan/progress  # Update progress

// Practice
GET  /api/writenow/question/:id    # Get personalized question
POST /api/writenow/feedback        # Enhanced feedback
GET  /api/writenow/sessions/:id    # Practice history
```

## 📊 Success Metrics

- **Week 1-2**: Foundation (Database + Assessment) ✅
- **Week 3**: Learning Plan Generation ✅  
- **Week 4**: Personalized Practice Framework ✅
- **Week 6**: Integrated User Experience ✅

Built with simplicity and effectiveness in mind - transforming basic TOEFL practice into a comprehensive personalized learning platform. 