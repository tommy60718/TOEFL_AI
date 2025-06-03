/**
 * Write Track Lite - API Client Module
 * Centralized API communication with error handling and common patterns
 */

class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
    }

    // Generic HTTP request method with error handling
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error for ${endpoint}:`, error);
            throw error;
        }
    }

    // User Profile APIs
    async createUserProfile(profileData) {
        return this.request('/api/writepath/profile', {
            method: 'POST',
            body: JSON.stringify(profileData)
        });
    }

    async getUserProfile(userId) {
        return this.request(`/api/writepath/profile/${userId}`);
    }

    // Assessment APIs
    async conductAssessment(assessmentData) {
        return this.request('/api/writepath/assess', {
            method: 'POST',
            body: JSON.stringify(assessmentData)
        });
    }

    async getAssessmentResults(userId) {
        return this.request(`/api/writepath/results/${userId}`);
    }

    // Learning Path APIs
    async generateLearningPlan(userId) {
        return this.request('/api/writepath/generate-plan', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
    }

    async getLearningPlan(userId) {
        return this.request(`/api/writepath/plan/${userId}`);
    }

    async updatePlanProgress(userId, completedDay) {
        return this.request('/api/writepath/plan/progress', {
            method: 'PUT',
            body: JSON.stringify({
                user_id: userId,
                completed_day: completedDay
            })
        });
    }

    // Practice APIs
    async getPersonalizedQuestion(userId) {
        return this.request(`/api/writenow/question/${userId}`);
    }

    async getEnhancedFeedback(userId, answer, questionId) {
        return this.request('/api/writenow/feedback', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                user_answer: answer,
                question_id: questionId
            })
        });
    }

    async getBasicFeedback(answer, questionId) {
        return this.request('/submit', {
            method: 'POST',
            body: JSON.stringify({
                answer,
                questionId
            })
        });
    }

    async getPracticeSessions(userId) {
        return this.request(`/api/writenow/sessions/${userId}`);
    }
}

// Create global API client instance
window.apiClient = new APIClient(); 