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
│   │   └── server.js          # Express API gateway
│   └── python/
│       └── main.py            # FastAPI + AI processing
└── docs/                      # Documentation
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 14+
- Python 3.8+
- Google Gemini API key

### 1. Python Backend Setup

```bash
cd backend/python
pip install fastapi uvicorn python-dotenv google-generativeai pydantic
echo "GEMINI_API_KEY=your_actual_api_key" > .env
python main.py
```

### 2. Node.js Backend Setup

```bash
cd backend/node
npm install express cors node-fetch
npm start
```

### 3. Access the Platform

Open browser: `http://localhost:3000`

**Complete User Journey:**
1. Take Assessment → `http://localhost:3000/assessment.html`
2. View Dashboard → `http://localhost:3000/dashboard.html`
3. Follow Learning Plan → `http://localhost:3000/writepath/plan.html`
4. Practice Writing → `http://localhost:3000/index.html`

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

## 🔧 Development

```bash
# Development mode with auto-reload
cd backend/python && python main.py
cd backend/node && npm run dev
```

## 📊 Success Metrics

- **Week 1-2**: Foundation (Database + Assessment) ✅
- **Week 3**: Learning Plan Generation ✅  
- **Week 4**: Personalized Practice Framework ✅
- **Week 6**: Integrated User Experience ✅

Built with simplicity and effectiveness in mind - transforming basic TOEFL practice into a comprehensive personalized learning platform. 