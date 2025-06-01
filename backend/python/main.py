from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import datetime
from typing import Optional, List, Dict
import uuid

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Write Track Lite API")

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

# Pydantic Models
class SubmissionRequest(BaseModel):
    userAnswer: str
    referenceAnswer: str
    questionId: str

class UserProfileRequest(BaseModel):
    user_type: str  # "toefl", "general", "academic"
    proficiency_level: Optional[str] = None  # Will be determined by assessment
    target_score: Optional[int] = None
    learning_goals: List[str]
    sample_writing: Optional[str] = None

class AssessmentRequest(BaseModel):
    user_id: str
    sample_writing: str
    assessment_type: str = "initial"

class LearningPathUpdate(BaseModel):
    user_id: str
    progress: Dict
    completed_tasks: List[str]

class PracticeSessionRequest(BaseModel):
    user_id: str
    session_type: str = "practice"
    question_id: Optional[str] = None

class EnhancedFeedbackRequest(BaseModel):
    user_id: str
    user_answer: str
    question_id: str

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

# User Profile Management APIs
@app.post("/api/writepath/profile")
async def create_user_profile(request: UserProfileRequest):
    try:
        # Generate a unique user ID
        user_id = str(uuid.uuid4())
        
        conn = sqlite3.connect('toefl.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO user_profiles 
            (id, user_type, proficiency_level, target_score, learning_goals, sample_writing)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            user_id, 
            request.user_type, 
            request.proficiency_level,
            request.target_score,
            json.dumps(request.learning_goals),
            request.sample_writing
        ))
        
        conn.commit()
        print(f"Created user profile for user_id: {user_id}")
        
        return {
            "user_id": user_id,
            "message": "User profile created successfully",
            "requires_assessment": request.proficiency_level is None
        }
    except sqlite3.Error as e:
        print(f"Database error in create_user_profile: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.get("/api/writepath/profile/{user_id}")
async def get_user_profile(user_id: str):
    try:
        conn = sqlite3.connect('toefl.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, user_type, proficiency_level, target_score, learning_goals, 
                   sample_writing, created_at, updated_at
            FROM user_profiles WHERE id = ?
        """, (user_id,))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        profile = {
            "user_id": result[0],
            "user_type": result[1],
            "proficiency_level": result[2],
            "target_score": result[3],
            "learning_goals": json.loads(result[4]) if result[4] else [],
            "sample_writing": result[5],
            "created_at": result[6],
            "updated_at": result[7]
        }
        
        return profile
    except sqlite3.Error as e:
        print(f"Database error in get_user_profile: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.put("/api/writepath/profile/{user_id}")
async def update_user_profile(user_id: str, request: UserProfileRequest):
    try:
        conn = sqlite3.connect('toefl.db')
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute("SELECT id FROM user_profiles WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Update profile
        cursor.execute("""
            UPDATE user_profiles 
            SET user_type = ?, proficiency_level = ?, target_score = ?, 
                learning_goals = ?, sample_writing = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            request.user_type,
            request.proficiency_level,
            request.target_score,
            json.dumps(request.learning_goals),
            request.sample_writing,
            user_id
        ))
        
        conn.commit()
        print(f"Updated user profile for user_id: {user_id}")
        
        return {"message": "User profile updated successfully"}
    except sqlite3.Error as e:
        print(f"Database error in update_user_profile: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

# Assessment APIs
def get_assessment_prompt(sample_writing, user_type):
    return f"""You are an expert English writing assessor. Analyze the following writing sample and provide a comprehensive assessment.

Writing Sample: {sample_writing}
User Type: {user_type}

Please analyze the writing and respond with ONLY a JSON object in this exact format:
{{
    "proficiency_score": integer from 10-30 (TOEFL-style scoring),
    "proficiency_level": "beginner", "intermediate", or "advanced",
    "weak_areas": [
        "grammar",
        "vocabulary", 
        "organization",
        "development",
        "language_use"
    ],
    "strengths": [
        "List of 2-3 specific strengths"
    ],
    "detailed_analysis": {{
        "grammar": "Brief analysis of grammar usage",
        "vocabulary": "Assessment of vocabulary range and accuracy", 
        "organization": "Evaluation of structure and coherence",
        "development": "Analysis of idea development and support",
        "language_use": "Assessment of sentence variety and fluency"
    }},
    "recommendations": [
        "Specific improvement recommendation 1",
        "Specific improvement recommendation 2", 
        "Specific improvement recommendation 3"
    ]
}}

Return ONLY the JSON object with no additional text or formatting."""

@app.post("/api/writepath/assess")
async def conduct_assessment(request: AssessmentRequest):
    try:
        # Get the assessment prompt
        prompt = get_assessment_prompt(request.sample_writing, "writing_assessment")
        print(f"Conducting assessment for user_id: {request.user_id}")
        
        # Get AI analysis
        response = model.generate_content(prompt)
        assessment_text = response.text
        
        # Clean up response if needed
        if assessment_text.startswith("```json") or assessment_text.startswith('```'):
            assessment_text = assessment_text.replace('```json', '').replace('```', '').strip()
        
        try:
            assessment_result = json.loads(assessment_text)
            # Validate required fields
            required_fields = ["proficiency_score", "proficiency_level", "weak_areas", "strengths", "detailed_analysis", "recommendations"]
            if not all(field in assessment_result for field in required_fields):
                raise ValueError("Assessment response missing required fields")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing assessment response: {e}")
            # Provide a default assessment structure
            assessment_result = {
                "proficiency_score": 15,
                "proficiency_level": "intermediate",
                "weak_areas": ["grammar", "vocabulary"],
                "strengths": ["Shows effort in writing", "Attempts to express ideas"],
                "detailed_analysis": {
                    "grammar": "Some grammar issues detected",
                    "vocabulary": "Basic vocabulary usage",
                    "organization": "Basic organization present",
                    "development": "Ideas need more development",
                    "language_use": "Simple sentence structures"
                },
                "recommendations": [
                    "Focus on grammar practice",
                    "Expand vocabulary range",
                    "Practice organizing ideas clearly"
                ]
            }
        
        # Store assessment in database
        conn = sqlite3.connect('toefl.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO assessment_results 
            (user_id, assessment_type, sample_writing, analysis_result, proficiency_score, weak_areas, recommendations)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            request.user_id,
            request.assessment_type,
            request.sample_writing,
            json.dumps(assessment_result),
            assessment_result["proficiency_score"],
            json.dumps(assessment_result["weak_areas"]),
            json.dumps(assessment_result["recommendations"])
        ))
        
        assessment_id = cursor.lastrowid
        
        # Update user profile with proficiency level
        cursor.execute("""
            UPDATE user_profiles 
            SET proficiency_level = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (assessment_result["proficiency_level"], request.user_id))
        
        conn.commit()
        print(f"Assessment completed and stored with ID: {assessment_id}")
        
        return {
            "assessment_id": assessment_id,
            "assessment_result": assessment_result,
            "message": "Assessment completed successfully"
        }
        
    except Exception as e:
        print(f"ERROR in conduct_assessment: {e}")
        raise HTTPException(status_code=500, detail=f"Assessment failed: {str(e)}")
    finally:
        conn.close()

@app.get("/api/writepath/results/{user_id}")
async def get_assessment_results(user_id: str):
    try:
        conn = sqlite3.connect('toefl.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, assessment_type, analysis_result, proficiency_score, 
                   weak_areas, recommendations, timestamp
            FROM assessment_results 
            WHERE user_id = ? 
            ORDER BY timestamp DESC
        """, (user_id,))
        
        results = cursor.fetchall()
        if not results:
            raise HTTPException(status_code=404, detail="No assessment results found for this user")
        
        assessments = []
        for result in results:
            assessment = {
                "assessment_id": result[0],
                "assessment_type": result[1],
                "analysis_result": json.loads(result[2]) if result[2] else {},
                "proficiency_score": result[3],
                "weak_areas": json.loads(result[4]) if result[4] else [],
                "recommendations": json.loads(result[5]) if result[5] else [],
                "timestamp": result[6]
            }
            assessments.append(assessment)
        
        return {
            "user_id": user_id,
            "total_assessments": len(assessments),
            "latest_assessment": assessments[0] if assessments else None,
            "all_assessments": assessments
        }
        
    except sqlite3.Error as e:
        print(f"Database error in get_assessment_results: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

# Learning Path Generation APIs
def get_learning_plan_prompt(assessment_result, learning_goals, user_type):
    weak_areas = ", ".join(assessment_result["weak_areas"])
    goals = ", ".join(learning_goals)
    
    return f"""You are an expert English writing instructor. Create a personalized 7-day learning plan based on the student's assessment results.

Student Profile:
- Focus Area: {user_type}
- Proficiency Level: {assessment_result["proficiency_level"]}
- Score: {assessment_result["proficiency_score"]}/30
- Weak Areas: {weak_areas}
- Learning Goals: {goals}

Create a structured 7-day plan following this format. Return ONLY a JSON object:
{{
    "plan_title": "Your Personalized 7-Day Writing Improvement Plan",
    "plan_summary": "Brief overview of what this plan will achieve",
    "daily_tasks": [
        {{
            "day": 1,
            "title": "Focus on Primary Weak Area",
            "focus_area": "primary weak area from assessment",
            "tasks": [
                "Specific task 1 (15-20 minutes)",
                "Specific task 2 (15-20 minutes)", 
                "Writing practice (20-30 minutes)"
            ],
            "learning_objective": "What the student will achieve today",
            "estimated_time": "60 minutes"
        }},
        {{
            "day": 2,
            "title": "Continue Primary Focus",
            "focus_area": "same as day 1 but different exercises",
            "tasks": [
                "Progressive task 1",
                "Progressive task 2",
                "Writing practice"
            ],
            "learning_objective": "Build on day 1 progress",
            "estimated_time": "60 minutes"
        }},
        {{
            "day": 3,
            "title": "Secondary Weak Area",
            "focus_area": "secondary weak area from assessment",
            "tasks": [
                "Specific task 1",
                "Specific task 2",
                "Writing practice"
            ],
            "learning_objective": "Address secondary weakness",
            "estimated_time": "60 minutes"
        }},
        {{
            "day": 4,
            "title": "Strengthen Secondary Area",
            "focus_area": "continue secondary area",
            "tasks": [
                "Progressive task 1",
                "Progressive task 2", 
                "Writing practice"
            ],
            "learning_objective": "Consolidate secondary improvements",
            "estimated_time": "60 minutes"
        }},
        {{
            "day": 5,
            "title": "Goal-Aligned Practice",
            "focus_area": "user's specific learning goals",
            "tasks": [
                "Goal-specific task 1",
                "Goal-specific task 2",
                "Comprehensive writing practice"
            ],
            "learning_objective": "Apply improvements to personal goals",
            "estimated_time": "60 minutes"
        }},
        {{
            "day": 6,
            "title": "Integration & Practice",
            "focus_area": "combine all improvements",
            "tasks": [
                "Integrated practice task 1",
                "Integrated practice task 2",
                "Full writing exercise"
            ],
            "learning_objective": "Synthesize all learning",
            "estimated_time": "60 minutes"
        }},
        {{
            "day": 7,
            "title": "Review & Assessment",
            "focus_area": "evaluation and next steps",
            "tasks": [
                "Review week's progress",
                "Complete practice assessment",
                "Plan next steps"
            ],
            "learning_objective": "Evaluate progress and plan continuation",
            "estimated_time": "60 minutes"
        }}
    ],
    "weekly_goal": "Primary objective for the week",
    "success_metrics": [
        "Measurable outcome 1",
        "Measurable outcome 2",
        "Measurable outcome 3"
    ]
}}

Focus on practical, actionable tasks that directly address the identified weak areas and align with the student's goals."""

@app.post("/api/writepath/generate-plan")
async def generate_learning_plan(request: dict):
    try:
        user_id = request.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        # Get user profile and latest assessment
        conn = sqlite3.connect('toefl.db')
        cursor = conn.cursor()
        
        # Get user profile
        cursor.execute("""
            SELECT user_type, learning_goals FROM user_profiles WHERE id = ?
        """, (user_id,))
        profile_result = cursor.fetchone()
        
        if not profile_result:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        user_type, learning_goals_json = profile_result
        learning_goals = json.loads(learning_goals_json) if learning_goals_json else []
        
        # Get latest assessment
        cursor.execute("""
            SELECT analysis_result FROM assessment_results 
            WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1
        """, (user_id,))
        assessment_result = cursor.fetchone()
        
        if not assessment_result:
            raise HTTPException(status_code=404, detail="No assessment found. Please complete assessment first.")
        
        assessment_data = json.loads(assessment_result[0])
        
        # Generate learning plan using AI
        prompt = get_learning_plan_prompt(assessment_data, learning_goals, user_type)
        print(f"Generating learning plan for user: {user_id}")
        
        response = model.generate_content(prompt)
        plan_text = response.text
        
        # Clean up response
        if plan_text.startswith("```json") or plan_text.startswith('```'):
            plan_text = plan_text.replace('```json', '').replace('```', '').strip()
        
        try:
            learning_plan = json.loads(plan_text)
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing learning plan response: {e}")
            # Provide a default 7-day plan
            learning_plan = {
                "plan_title": "Your Personalized 7-Day Writing Improvement Plan",
                "plan_summary": f"A focused plan to improve your {', '.join(assessment_data['weak_areas'][:2])} skills",
                "daily_tasks": [
                    {
                        "day": i + 1,
                        "title": f"Day {i + 1}: Writing Practice",
                        "focus_area": assessment_data['weak_areas'][0] if assessment_data['weak_areas'] else "general writing",
                        "tasks": [
                            "Practice writing exercises",
                            "Review grammar rules", 
                            "Complete writing prompt"
                        ],
                        "learning_objective": f"Improve {assessment_data['weak_areas'][0] if assessment_data['weak_areas'] else 'writing skills'}",
                        "estimated_time": "60 minutes"
                    } for i in range(7)
                ],
                "weekly_goal": "Improve overall writing proficiency",
                "success_metrics": ["Complete daily tasks", "Show improvement in weak areas"]
            }
        
        # Store learning plan in database
        cursor.execute("""
            INSERT INTO learning_paths (user_id, path_data, progress, weak_areas, recommendations)
            VALUES (?, ?, ?, ?, ?)
        """, (
            user_id,
            json.dumps(learning_plan),
            json.dumps({"completed_days": [], "current_day": 1, "completion_percentage": 0}),
            json.dumps(assessment_data["weak_areas"]),
            json.dumps(assessment_data["recommendations"])
        ))
        
        plan_id = cursor.lastrowid
        conn.commit()
        
        print(f"Learning plan generated and stored with ID: {plan_id}")
        
        return {
            "plan_id": plan_id,
            "learning_plan": learning_plan,
            "message": "Learning plan generated successfully"
        }
        
    except Exception as e:
        print(f"ERROR in generate_learning_plan: {e}")
        raise HTTPException(status_code=500, detail=f"Plan generation failed: {str(e)}")
    finally:
        conn.close()

@app.get("/api/writepath/plan/{user_id}")
async def get_learning_plan(user_id: str):
    try:
        conn = sqlite3.connect('toefl.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, path_data, progress, created_at 
            FROM learning_paths 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        """, (user_id,))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="No learning plan found for this user")
        
        plan_id, path_data, progress, created_at = result
        
        return {
            "plan_id": plan_id,
            "learning_plan": json.loads(path_data) if path_data else {},
            "progress": json.loads(progress) if progress else {},
            "created_at": created_at
        }
        
    except sqlite3.Error as e:
        print(f"Database error in get_learning_plan: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.put("/api/writepath/plan/progress")
async def update_plan_progress(request: dict):
    try:
        user_id = request.get("user_id")
        completed_day = request.get("completed_day")
        
        if not user_id or completed_day is None:
            raise HTTPException(status_code=400, detail="User ID and completed day are required")
        
        conn = sqlite3.connect('toefl.db')
        cursor = conn.cursor()
        
        # Get current progress
        cursor.execute("""
            SELECT id, progress FROM learning_paths 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        """, (user_id,))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="No learning plan found")
        
        plan_id, current_progress = result
        progress_data = json.loads(current_progress) if current_progress else {"completed_days": [], "current_day": 1}
        
        # Update progress
        if completed_day not in progress_data["completed_days"]:
            progress_data["completed_days"].append(completed_day)
            progress_data["current_day"] = min(completed_day + 1, 7)
            progress_data["completion_percentage"] = (len(progress_data["completed_days"]) / 7) * 100
        
        # Update database
        cursor.execute("""
            UPDATE learning_paths 
            SET progress = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (json.dumps(progress_data), plan_id))
        
        conn.commit()
        
        return {
            "message": "Progress updated successfully",
            "progress": progress_data
        }
        
    except sqlite3.Error as e:
        print(f"Database error in update_plan_progress: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

# Week 4: Practice Framework APIs
@app.get("/api/writenow/question/{user_id}")
async def get_personalized_question(user_id: str):
    try:
        conn = sqlite3.connect('toefl.db')
        cursor = conn.cursor()
        
        # Get user profile and latest assessment
        cursor.execute("""
            SELECT proficiency_level, learning_goals FROM user_profiles WHERE id = ?
        """, (user_id,))
        profile_result = cursor.fetchone()
        
        if not profile_result:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        proficiency_level, learning_goals_json = profile_result
        
        # Get user's weak areas from latest assessment
        cursor.execute("""
            SELECT weak_areas FROM assessment_results 
            WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1
        """, (user_id,))
        assessment_result = cursor.fetchone()
        
        weak_areas = []
        if assessment_result and assessment_result[0]:
            weak_areas = json.loads(assessment_result[0])
        
        # Select appropriate question based on proficiency and weak areas
        # Priority: match difficulty level and focus on weak areas
        cursor.execute("""
            SELECT id, question_text, reference_answer, learning_objectives, tags
            FROM questions_bank 
            WHERE difficulty_level = ? OR difficulty_level = 'general'
            ORDER BY RANDOM() 
            LIMIT 1
        """, (proficiency_level or 'intermediate',))
        
        question_result = cursor.fetchone()
        if not question_result:
            raise HTTPException(status_code=404, detail="No suitable questions found")
        
        question = {
            "question_id": str(question_result[0]),
            "question_text": question_result[1],
            "reference_answer": question_result[2],
            "learning_objectives": json.loads(question_result[3]) if question_result[3] else [],
            "tags": json.loads(question_result[4]) if question_result[4] else [],
            "selected_for": weak_areas[:2] if weak_areas else ["general practice"],
            "difficulty_level": proficiency_level or 'intermediate'
        }
        
        return question
        
    except sqlite3.Error as e:
        print(f"Database error in get_personalized_question: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.post("/api/writenow/feedback")
async def get_enhanced_feedback(request: EnhancedFeedbackRequest):
    try:
        conn = sqlite3.connect('toefl.db')
        cursor = conn.cursor()
        
        # Get user context
        cursor.execute("""
            SELECT proficiency_level FROM user_profiles WHERE id = ?
        """, (request.user_id,))
        profile_result = cursor.fetchone()
        
        cursor.execute("""
            SELECT weak_areas, recommendations FROM assessment_results 
            WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1
        """, (request.user_id,))
        assessment_result = cursor.fetchone()
        
        # Get question details
        cursor.execute("""
            SELECT reference_answer FROM questions_bank WHERE id = ?
        """, (request.question_id,))
        question_result = cursor.fetchone()
        
        if not question_result:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Build context-aware prompt
        user_context = {
            "proficiency_level": profile_result[0] if profile_result else "intermediate",
            "weak_areas": json.loads(assessment_result[0]) if assessment_result and assessment_result[0] else [],
            "recommendations": json.loads(assessment_result[1]) if assessment_result and assessment_result[1] else []
        }
        
        enhanced_prompt = get_enhanced_feedback_prompt(
            request.user_answer, 
            question_result[0], 
            user_context
        )
        
        # Get AI feedback
        response = model.generate_content(enhanced_prompt)
        feedback_text = response.text
        
        # Clean and parse response
        if feedback_text.startswith("```json") or feedback_text.startswith('```'):
            feedback_text = feedback_text.replace('```json', '').replace('```', '').strip()
        
        try:
            feedback_json = json.loads(feedback_text)
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing enhanced feedback: {e}")
            feedback_json = {
                "corrections": ["Please review grammar and sentence structure."],
                "suggestions": ["Focus on clarity and coherence.", "Expand your vocabulary range."],
                "score": 15,
                "personalized_tips": ["Continue practicing based on your learning plan."],
                "progress_notes": "Keep working on your identified weak areas."
            }
        
        # Store practice session
        cursor.execute("""
            INSERT INTO practice_sessions 
            (user_id, session_type, questions_attempted, completion_status, performance_metrics)
            VALUES (?, ?, ?, ?, ?)
        """, (
            request.user_id,
            "enhanced_practice",
            json.dumps([request.question_id]),
            "completed",
            json.dumps({
                "score": feedback_json.get("score", 15),
                "weak_areas_addressed": user_context["weak_areas"][:2],
                "feedback_type": "enhanced"
            })
        ))
        
        conn.commit()
        print(f"Enhanced feedback provided and session stored for user: {request.user_id}")
        
        return feedback_json
        
    except Exception as e:
        print(f"ERROR in get_enhanced_feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Enhanced feedback failed: {str(e)}")
    finally:
        conn.close()

def get_enhanced_feedback_prompt(user_answer, reference_answer, user_context):
    weak_areas_text = ", ".join(user_context["weak_areas"][:3]) if user_context["weak_areas"] else "general writing skills"
    
    return f"""You are a personalized TOEFL writing tutor. Analyze this student's answer with their specific learning context in mind.

Student Context:
- Proficiency Level: {user_context["proficiency_level"]}
- Known Weak Areas: {weak_areas_text}
- Current Learning Focus: {', '.join(user_context["recommendations"][:2]) if user_context["recommendations"] else "general improvement"}

Student's Answer: {user_answer}
Reference Answer: {reference_answer}

Provide personalized feedback in this JSON format:
{{
    "corrections": [List of specific corrections focusing on the student's weak areas],
    "suggestions": [Improvement suggestions tailored to their proficiency level],
    "score": TOEFL score (0-30),
    "personalized_tips": [2-3 specific tips based on their weak areas and level],
    "progress_notes": "Brief note on how this relates to their learning journey",
    "focus_areas": [Areas they should prioritize based on this writing sample]
}}

Focus especially on their known weak areas: {weak_areas_text}. 
Adjust complexity of feedback to their {user_context["proficiency_level"]} level.
Return ONLY the JSON object."""

# Practice Session Management
@app.get("/api/writenow/sessions/{user_id}")
async def get_practice_sessions(user_id: str):
    try:
        conn = sqlite3.connect('toefl.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, session_type, questions_attempted, completion_status, 
                   performance_metrics, timestamp
            FROM practice_sessions 
            WHERE user_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 10
        """, (user_id,))
        
        results = cursor.fetchall()
        sessions = []
        
        for result in results:
            session = {
                "session_id": result[0],
                "session_type": result[1],
                "questions_attempted": json.loads(result[2]) if result[2] else [],
                "completion_status": result[3],
                "performance_metrics": json.loads(result[4]) if result[4] else {},
                "timestamp": result[5]
            }
            sessions.append(session)
        
        # Calculate basic statistics
        total_sessions = len(sessions)
        avg_score = 0
        if sessions:
            scores = [s["performance_metrics"].get("score", 0) for s in sessions if "score" in s["performance_metrics"]]
            avg_score = sum(scores) / len(scores) if scores else 0
        
        return {
            "user_id": user_id,
            "total_sessions": total_sessions,
            "average_score": round(avg_score, 1),
            "recent_sessions": sessions
        }
        
    except sqlite3.Error as e:
        print(f"Database error in get_practice_sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

# Database initialization
def init_db():
    try:
        conn = sqlite3.connect('toefl.db')
        cursor = conn.cursor()
        
        # Original submissions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id TEXT,
                user_answer TEXT,
                feedback TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # User profiles table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                id TEXT PRIMARY KEY,
                user_type TEXT NOT NULL,
                proficiency_level TEXT,
                target_score INTEGER,
                learning_goals TEXT, -- JSON array
                sample_writing TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Learning paths table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS learning_paths (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                path_data TEXT, -- JSON object
                progress TEXT, -- JSON object
                weak_areas TEXT, -- JSON array
                recommendations TEXT, -- JSON array
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user_profiles (id)
            )
        """)
        
        # Practice sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS practice_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                session_type TEXT,
                questions_attempted TEXT, -- JSON array
                completion_status TEXT,
                performance_metrics TEXT, -- JSON object
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user_profiles (id)
            )
        """)
        
        # Expanded questions bank
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS questions_bank (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT,
                difficulty_level TEXT,
                question_text TEXT,
                reference_answer TEXT,
                learning_objectives TEXT, -- JSON array
                tags TEXT, -- JSON array
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Assessment results table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS assessment_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                assessment_type TEXT,
                sample_writing TEXT,
                analysis_result TEXT, -- JSON object
                proficiency_score INTEGER,
                weak_areas TEXT, -- JSON array
                recommendations TEXT, -- JSON array
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user_profiles (id)
            )
        """)
        
        # Insert some default questions if table is empty
        cursor.execute("SELECT COUNT(*) FROM questions_bank")
        if cursor.fetchone()[0] == 0:
            default_questions = [
                ("toefl", "intermediate", 
                 "Do you agree or disagree with the following statement? Modern technology has made life more complicated. Use specific reasons and examples to support your answer.",
                 "Technology has both simplified and complicated modern life. While it has automated many tasks and improved communication, it has also introduced new challenges like digital security concerns, information overload, and technological dependence. However, these complications are balanced by significant benefits in healthcare, education, and global connectivity. The key to managing technology is developing proper skills and establishing boundaries for its use.",
                 '["argumentation", "technology_opinion", "examples_support"]',
                 '["technology", "opinion", "toefl", "independent_writing"]'),
                 
                ("toefl", "beginner",
                 "What is your favorite season and why? Write about your favorite activities during this season.",
                 "My favorite season is spring because of the pleasant weather and beautiful flowers. During spring, I enjoy outdoor activities like hiking and picnicking. The moderate temperature makes it perfect for spending time outside. Spring also represents new beginnings and hope, which makes me feel optimistic about the future.",
                 '["descriptive_writing", "personal_preference", "basic_reasoning"]',
                 '["seasons", "personal", "descriptive", "basic"]'),
                 
                ("toefl", "advanced",
                 "Some people believe that universities should focus on practical job training, while others think they should emphasize broader education. Discuss both views and give your opinion.",
                 "Universities serve dual purposes in modern society. Practical job training ensures graduates are employment-ready with specific skills demanded by industries, reducing unemployment and boosting economic productivity. However, broader education develops critical thinking, cultural awareness, and adaptability - qualities essential for leadership and innovation. The ideal approach combines both: core curricula providing broad knowledge with specialized tracks offering practical skills. This balanced model produces well-rounded graduates capable of both immediate contribution and long-term growth in their careers.",
                 '["comparative_analysis", "balanced_argument", "complex_reasoning"]',
                 '["education", "university", "career", "advanced_argument"]')
            ]
            
            cursor.executemany("""
                INSERT INTO questions_bank 
                (category, difficulty_level, question_text, reference_answer, learning_objectives, tags)
                VALUES (?, ?, ?, ?, ?, ?)
            """, default_questions)
        
        conn.commit()
        print("Database initialized successfully with all tables")
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