from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="TOEFL Writing Practice API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found in environment variables")
    api_key = "YOUR_GEMINI_API_KEY"  # Replace with your actual API key if not using env variables

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.5-flash-preview-04-17')

class SubmissionRequest(BaseModel):
    userAnswer: str
    referenceAnswer: str
    questionId: str

def get_system_prompt(user_answer, reference_answer):
    return f"""You are a TOEFL writing expert tutor. Analyze the following student's answer 
    compared to the reference answer. Provide feedback in the following JSON format:
    {{
        "corrections": [List of specific sentences or grammar mistakes that need correction],
        "suggestions": [List of improvement suggestions for content, organization, and language use],
        "score": TOEFL writing score (0-30, based on official TOEFL writing rubric)
    }}

    IMPORTANT: Return ONLY the JSON with no markdown formatting, no code blocks, and no additional text.

    Student's Answer: {user_answer}
    Reference Answer: {reference_answer}
    
    Focus on providing constructive feedback that will help the student improve their writing skills.
    Analyze grammar, vocabulary, organization, development of ideas, and overall coherence.
    """

@app.post("/analyze")
async def analyze_answer(request: SubmissionRequest):
    if not request.userAnswer:
        raise HTTPException(status_code=400, detail="User answer cannot be empty")
    
    # Generate system prompt
    prompt = get_system_prompt(request.userAnswer, request.referenceAnswer)
    print(f"Sending request to Gemini API with prompt length: {len(prompt)}")
    
    try:
        # Get Gemini's response
        response = model.generate_content(prompt)
        feedback_text = response.text
        print(f"Received response from Gemini API: {feedback_text[:100]}...")
        
        # Clean up response if it's wrapped in markdown code blocks
        if feedback_text.startswith("```json") or feedback_text.startswith('```'):
            # Strip markdown code block syntax
            print("Detected markdown code block, cleaning response")
            feedback_text = feedback_text.replace('```json', '').replace('```', '').strip()
        
        # Try to parse the response to ensure it's valid JSON
        try:
            feedback_json = json.loads(feedback_text)
            # Ensure required fields are present
            if not all(key in feedback_json for key in ["corrections", "suggestions", "score"]):
                raise ValueError("Response missing required fields")
            print(f"Successfully parsed JSON with {len(feedback_json.get('corrections', []))} corrections and {len(feedback_json.get('suggestions', []))} suggestions")
        except (json.JSONDecodeError, ValueError) as e:
            # If not valid JSON or missing fields, format it properly
            print(f"Error parsing Gemini response: {e}")
            print(f"Original response: {feedback_text}")
            # Create a default structure
            feedback_json = {
                "corrections": ["The AI response format was incorrect."],
                "suggestions": ["Please try again with a different answer."],
                "score": 0
            }
            feedback_text = json.dumps(feedback_json)
            print("Created default JSON structure")
        
        # Store in SQLite
        try:
            conn = sqlite3.connect('toefl.db')
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO submissions (question_id, user_answer, feedback)
                VALUES (?, ?, ?)
            """, (request.questionId, request.userAnswer, feedback_text))
            conn.commit()
            print(f"Stored feedback in database for question ID: {request.questionId}")
        except sqlite3.Error as e:
            print(f"Database error: {e}")
        finally:
            conn.close()
        
        return feedback_json
    except Exception as e:
        print(f"ERROR in analyze_answer: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# Database initialization
def init_db():
    try:
        conn = sqlite3.connect('toefl.db')
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id TEXT,
                user_answer TEXT,
                feedback TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
    except sqlite3.Error as e:
        print(f"Database initialization error: {e}")
    finally:
        conn.close()

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

if __name__ == "__main__":
    import uvicorn
    init_db()
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 