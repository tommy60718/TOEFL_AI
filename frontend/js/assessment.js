/**
 * Write Track Lite - Assessment Module
 * Handles the 4-step assessment flow and user profile creation
 */

class Assessment {
    constructor() {
        this.currentStep = 1;
        this.userId = null;
        this.assessmentData = null;
    }

    init() {
        // Initialize user manager but don't require authentication for assessment
        userManager.init();
        this.showStep(1);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // User type change handler
        const userTypeSelect = document.getElementById('userType');
        const targetScoreGroup = document.getElementById('targetScoreGroup');
        
        if (userTypeSelect && targetScoreGroup) {
            userTypeSelect.addEventListener('change', (e) => {
                if (e.target.value === 'toefl') {
                    targetScoreGroup.style.display = 'block';
                } else {
                    targetScoreGroup.style.display = 'none';
                }
            });
        }

        // Word count functionality
        const sampleWritingTextarea = document.getElementById('sampleWriting');
        const wordCountElement = document.getElementById('wordCount');
        
        if (sampleWritingTextarea && wordCountElement) {
            sampleWritingTextarea.addEventListener('input', function() {
                const text = this.value;
                const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
                wordCountElement.textContent = wordCount;
            });
        }
    }

    showStep(stepNumber) {
        // Hide all steps
        const steps = document.querySelectorAll('.step');
        steps.forEach(step => step.classList.remove('active'));
        
        // Show current step
        const currentStepEl = document.getElementById('step' + stepNumber);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
        }
        
        this.updateProgress();
    }

    updateProgress() {
        const progress = (this.currentStep / 4) * 100;
        UIHelpers.updateProgress('progressBar', progress);
    }

    nextStep() {
        if (this.currentStep === 1) {
            if (this.validateProfileForm()) {
                this.currentStep++;
                this.showStep(this.currentStep);
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    validateProfileForm() {
        const userType = document.getElementById('userType').value;
        const goals = document.querySelectorAll('input[type="checkbox"]:checked');

        const formData = {
            userType,
            goals: Array.from(goals).map(cb => cb.value)
        };

        const validation = UIHelpers.validateForm(formData);
        
        if (!validation.isValid) {
            alert(validation.errors[0]);
            return false;
        }

        return true;
    }

    async submitAssessment() {
        const sampleWriting = document.getElementById('sampleWriting').value.trim();
        
        const validation = UIHelpers.validateWritingSample(sampleWriting);
        if (!validation.isValid) {
            alert(validation.error);
            return;
        }

        // Move to processing step
        this.currentStep = 3;
        this.showStep(this.currentStep);

        try {
            // First, create user profile
            await this.createUserProfile();
            
            // Then conduct assessment
            await this.conductAssessment(sampleWriting);
            
            // Show results
            this.currentStep = 4;
            this.showStep(this.currentStep);
            
        } catch (error) {
            console.error('Assessment error:', error);
            alert('Sorry, there was an error processing your assessment. Please try again.');
            this.currentStep = 2;
            this.showStep(this.currentStep);
        }
    }

    async createUserProfile() {
        const userType = document.getElementById('userType').value;
        const targetScore = document.getElementById('targetScore').value;
        const goals = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        const profileData = {
            user_type: userType,
            target_score: targetScore ? parseInt(targetScore) : null,
            learning_goals: goals
        };

        const result = await apiClient.createUserProfile(profileData);
        this.userId = result.user_id;
        
        // Store user ID for future use
        userManager.persistUserId(this.userId);
    }

    async conductAssessment(sampleWriting) {
        const assessmentRequest = {
            user_id: this.userId,
            sample_writing: sampleWriting,
            assessment_type: 'initial'
        };

        const result = await apiClient.conductAssessment(assessmentRequest);
        this.assessmentData = result.assessment_result;
        
        this.displayResults(this.assessmentData);
    }

    displayResults(results) {
        const resultsContainer = document.getElementById('assessmentResults');
        resultsContainer.innerHTML = UIHelpers.renderAssessmentResults(results);
    }

    // Navigation methods
    goToDashboard() {
        userManager.navigateToDashboard();
    }

    startPractice() {
        userManager.navigateToPractice();
    }
}

// Initialize assessment when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.assessment = new Assessment();
    assessment.init();
});

// Export for potential use by other modules
window.Assessment = Assessment; 