/**
 * Write Track Lite - Dashboard Module
 * Handles dashboard data loading, display, and user interactions
 */

class Dashboard {
    constructor() {
        this.userId = null;
        this.userProfile = null;
        this.assessmentResults = null;
        this.learningPlan = null;
        this.practiceSessions = null;
    }

    async init() {
        this.userId = userManager.init();
        
        if (!this.userId) {
            UIHelpers.showError('No user found. Please complete an assessment first.');
            setTimeout(() => userManager.navigateToAssessment(), 2000);
            return;
        }

        await this.loadAllData();
    }

    async loadAllData() {
        try {
            UIHelpers.showLoading('loadingState', 'Loading your dashboard...');

            // Load all data in parallel for better performance
            const [userProfile, assessmentResults, learningPlan, practiceSessions] = await Promise.allSettled([
                apiClient.getUserProfile(this.userId),
                apiClient.getAssessmentResults(this.userId).catch(() => null),
                apiClient.getLearningPlan(this.userId).catch(() => null),
                apiClient.getPracticeSessions(this.userId).catch(() => null)
            ]);

            // Process results
            this.userProfile = userProfile.status === 'fulfilled' ? userProfile.value : null;
            this.assessmentResults = assessmentResults.status === 'fulfilled' ? assessmentResults.value : null;
            this.learningPlan = learningPlan.status === 'fulfilled' ? learningPlan.value : null;
            this.practiceSessions = practiceSessions.status === 'fulfilled' ? practiceSessions.value : null;

            UIHelpers.hideLoading('loadingState');
            this.displayDashboard();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            UIHelpers.hideLoading('loadingState');
            UIHelpers.showError('Failed to load dashboard data. Please refresh the page.');
        }
    }

    displayDashboard() {
        document.getElementById('dashboardContent').style.display = 'block';

        this.updateStatsGrid();
        this.updateProfileSection();
        this.updateLearningPlanSection();
        this.updateAssessmentSection();
        this.updatePracticeSection();
    }

    updateStatsGrid() {
        // Proficiency score
        if (this.assessmentResults?.latest_assessment?.proficiency_score) {
            document.getElementById('proficiencyScore').textContent = 
                this.assessmentResults.latest_assessment.proficiency_score;
        }

        // Proficiency level
        if (this.userProfile?.proficiency_level) {
            document.getElementById('proficiencyLevel').textContent = 
                UIHelpers.formatLevel(this.userProfile.proficiency_level);
        }

        // Learning plan progress
        if (this.learningPlan?.progress?.completed_days) {
            const completed = this.learningPlan.progress.completed_days.length;
            document.getElementById('completedDays').textContent = 
                UIHelpers.formatProgress(completed, 7);
        }

        // Practice average
        if (this.practiceSessions?.average_score) {
            document.getElementById('practiceScore').textContent = 
                this.practiceSessions.average_score;
        }
    }

    updateProfileSection() {
        const profileDetails = document.getElementById('profileDetails');
        
        if (this.userProfile) {
            const goals = this.userProfile.learning_goals ? 
                this.userProfile.learning_goals.join(', ') : 'None specified';
            
            profileDetails.innerHTML = `
                ${UIHelpers.renderInfoItem('Type', this.userProfile.user_type.toUpperCase())}
                ${UIHelpers.renderInfoItem('Level', UIHelpers.formatLevel(this.userProfile.proficiency_level))}
                ${UIHelpers.renderInfoItem('Goals', goals)}
            `;
        } else {
            profileDetails.innerHTML = '<p>Loading profile...</p>';
        }
    }

    updateLearningPlanSection() {
        const summary = document.getElementById('learningPlanSummary');
        const actionBtn = document.getElementById('planActionBtn');
        
        if (this.learningPlan?.learning_plan) {
            const progress = this.learningPlan.progress || { completed_days: [], completion_percentage: 0 };
            summary.innerHTML = `
                <div class="plan-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress.completion_percentage || 0}%"></div>
                    </div>
                    <p>${UIHelpers.formatProgress(progress.completed_days?.length || 0, 7)} days completed</p>
                    <p class="plan-title">${this.learningPlan.learning_plan.plan_title}</p>
                </div>
            `;
            actionBtn.textContent = 'View Plan';
            actionBtn.onclick = () => userManager.navigateToLearningPlan();
        } else if (this.assessmentResults?.latest_assessment) {
            summary.innerHTML = '<p>Assessment completed! Generate your personalized learning plan.</p>';
            actionBtn.textContent = 'Generate Plan';
            actionBtn.onclick = () => this.generatePlan();
        }
    }

    updateAssessmentSection() {
        const summary = document.getElementById('assessmentSummary');
        
        if (this.assessmentResults?.latest_assessment) {
            const assessment = this.assessmentResults.latest_assessment;
            const weakAreas = assessment.weak_areas || [];
            
            summary.innerHTML = `
                <div class="assessment-score">
                    <span class="score-badge">${UIHelpers.formatScore(assessment.proficiency_score)}</span>
                    <span class="level-badge">${UIHelpers.formatLevel(assessment.analysis_result?.proficiency_level)}</span>
                </div>
                <div class="weak-areas">
                    <p><strong>Focus Areas:</strong> ${weakAreas.slice(0, 3).join(', ')}</p>
                </div>
            `;
        } else {
            summary.innerHTML = '<p>No assessment completed yet. Take an assessment to get started!</p>';
        }
    }

    updatePracticeSection() {
        const summary = document.getElementById('practiceSummary');
        
        if (this.practiceSessions?.recent_sessions?.length > 0) {
            const recentSession = this.practiceSessions.recent_sessions[0];
            summary.innerHTML = `
                <div class="practice-stats">
                    <p><strong>Total Sessions:</strong> ${this.practiceSessions.total_sessions}</p>
                    <p><strong>Average Score:</strong> ${UIHelpers.formatScore(this.practiceSessions.average_score)}</p>
                    <p><strong>Last Session:</strong> ${UIHelpers.formatDate(recentSession.timestamp)}</p>
                </div>
            `;
        }
    }

    // Action handlers
    async generatePlan() {
        if (!this.assessmentResults?.latest_assessment) {
            alert('Please complete an assessment first to generate a learning plan.');
            userManager.navigateToAssessment();
            return;
        }

        await UIHelpers.handleAsyncOperation(
            () => apiClient.generateLearningPlan(this.userId),
            {
                buttonId: 'planActionBtn',
                errorMessage: 'Failed to generate learning plan. Please try again.',
                successCallback: () => userManager.navigateToLearningPlan()
            }
        );
    }

    takeAssessment() {
        userManager.navigateToAssessment();
    }

    viewLearningPlan() {
        if (this.learningPlan?.learning_plan) {
            userManager.navigateToLearningPlan();
        } else {
            this.generatePlan();
        }
    }

    startPractice() {
        userManager.navigateToPractice();
    }

    viewFullResults() {
        if (this.assessmentResults?.latest_assessment) {
            // Could create a detailed results page or show modal
            alert('Detailed results view coming soon!');
        } else {
            this.takeAssessment();
        }
    }

    viewProgress() {
        // Could create a progress tracking page
        alert('Detailed progress tracking coming soon!');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new Dashboard();
    dashboard.init();
});

// Export for potential use by other modules
window.Dashboard = Dashboard; 