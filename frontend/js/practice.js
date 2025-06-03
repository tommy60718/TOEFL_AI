/**
 * Write Track Lite - Practice Module
 * Handles writing practice interface, questions, and feedback
 */

class Practice {
    constructor() {
        this.userId = null;
        this.currentQuestion = null;
        this.processingTimer = null;
    }

    init() {
        this.userId = userManager.init();
        
        if (this.userId) {
            this.loadUserContext();
            this.loadPersonalizedQuestion();
        } else {
            this.loadDefaultQuestion();
        }
    }

    async loadUserContext() {
        try {
            const profile = await userManager.loadProfile();
            if (profile) {
                const contextDiv = document.getElementById('userContext');
                const welcomeText = document.getElementById('userWelcome');
                
                welcomeText.textContent = 
                    `Welcome back! Practicing for ${profile.user_type.toUpperCase()} | Level: ${UIHelpers.formatLevel(profile.proficiency_level)}`;
                contextDiv.style.display = 'block';
            }
        } catch (error) {
            console.log('Could not load user context:', error);
        }
    }

    async loadPersonalizedQuestion() {
        if (!this.userId) return;

        try {
            this.currentQuestion = await apiClient.getPersonalizedQuestion(this.userId);
            
            // Update question display
            document.getElementById('question').textContent = this.currentQuestion.question_text;
            
            // Show question metadata
            const metaDiv = document.getElementById('questionMeta');
            if (metaDiv) {
                document.getElementById('selectedFor').textContent = 
                    this.currentQuestion.selected_for.join(', ');
                document.getElementById('difficultyLevel').textContent = 
                    this.currentQuestion.difficulty_level;
                metaDiv.style.display = 'block';
            }
            
            // Show load new question button
            const loadBtn = document.getElementById('loadQuestionBtn');
            if (loadBtn) {
                loadBtn.style.display = 'inline-block';
            }
        } catch (error) {
            console.error('Failed to load personalized question:', error);
            this.loadDefaultQuestion();
        }
    }

    loadDefaultQuestion() {
        // Fallback to default question for anonymous users
        document.getElementById('question').textContent = 
            "Do you agree or disagree with the following statement? Modern technology has made life more complicated. Use specific reasons and examples to support your answer.";
        
        this.currentQuestion = {
            question_id: "1",
            question_text: document.getElementById('question').textContent,
            difficulty_level: "intermediate"
        };
    }

    async submitAnswer() {
        const answer = document.getElementById('userAnswer').value;
        
        if (!answer.trim()) {
            alert("Please type your answer before submitting");
            return;
        }

        // Start processing with timer
        this.startProcessing();

        try {
            let feedbackData;
            
            if (this.userId && this.currentQuestion) {
                // Use enhanced feedback for registered users
                feedbackData = await apiClient.getEnhancedFeedback(
                    this.userId, 
                    answer, 
                    this.currentQuestion.question_id
                );
            } else {
                // Use basic feedback for anonymous users
                feedbackData = await apiClient.getBasicFeedback(
                    answer, 
                    this.currentQuestion?.question_id || "1"
                );
            }

            this.stopProcessing();
            this.displayFeedback(feedbackData, !!this.userId);

        } catch (error) {
            this.stopProcessing();
            console.error('Error submitting answer:', error);
            alert("Failed to submit answer. Please try again later.");
        }
    }

    startProcessing() {
        const loadingIndicator = document.getElementById('loading-indicator');
        const submitBtn = document.getElementById('submitBtn');
        const secondsCounter = document.getElementById('seconds-counter');
        
        loadingIndicator.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        let secondsCount = 0;
        secondsCounter.textContent = secondsCount;
        
        this.processingTimer = setInterval(() => {
            secondsCount++;
            secondsCounter.textContent = secondsCount;
        }, 1000);
    }

    stopProcessing() {
        const loadingIndicator = document.getElementById('loading-indicator');
        const submitBtn = document.getElementById('submitBtn');
        
        if (this.processingTimer) {
            clearInterval(this.processingTimer);
            this.processingTimer = null;
        }
        
        loadingIndicator.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit for Personalized AI Review';
    }

    displayFeedback(feedback, isPersonalized = false) {
        const feedbackDiv = document.getElementById('feedback');
        feedbackDiv.style.display = 'block';
        
        try {
            // Parse feedback if it's a string (JSON)
            const feedbackData = typeof feedback === 'string' ? JSON.parse(feedback) : feedback;
            
            feedbackDiv.innerHTML = UIHelpers.renderFeedback(feedbackData, isPersonalized);
            
        } catch (e) {
            // Fallback for raw text feedback
            feedbackDiv.innerHTML = `
                <div class="feedback-content">
                    <h3>📊 AI Feedback Results</h3>
                    <div style="background: white; border-radius: 8px; padding: 20px;">${feedback}</div>
                </div>
            `;
        }
        
        // Smooth scroll to feedback
        UIHelpers.scrollToElement('feedback');
    }

    // Load a new personalized question
    async loadNewQuestion() {
        if (!this.userId) {
            alert('Please complete an assessment to get personalized questions.');
            userManager.navigateToAssessment();
            return;
        }

        await UIHelpers.handleAsyncOperation(
            () => this.loadPersonalizedQuestion(),
            {
                buttonId: 'loadQuestionBtn',
                errorMessage: 'Failed to load new question. Please try again.'
            }
        );
    }

    // Navigation helpers
    goToDashboard() {
        userManager.navigateToDashboard();
    }

    takeAssessment() {
        userManager.navigateToAssessment();
    }
}

// Initialize practice when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.practice = new Practice();
    practice.init();
});

// Export for potential use by other modules
window.Practice = Practice; 