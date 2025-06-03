/**
 * Write Track Lite - Learning Plan Module
 * Handles learning plan display, progress tracking, and completion
 */

class LearningPlan {
    constructor() {
        this.userId = null;
        this.learningPlan = null;
        this.progress = null;
    }

    async init() {
        this.userId = userManager.init();

        if (!this.userId) {
            UIHelpers.showError('No user ID found. Please complete an assessment first.');
            setTimeout(() => userManager.navigateToAssessment(), 2000);
            return;
        }

        await this.loadLearningPlan();
    }

    async loadLearningPlan() {
        try {
            UIHelpers.showLoading('loadingState', 'Loading your learning plan...');
            
            const data = await apiClient.getLearningPlan(this.userId);
            this.learningPlan = data.learning_plan;
            this.progress = data.progress;

            UIHelpers.hideLoading('loadingState');
            this.displayLearningPlan();
            
        } catch (error) {
            if (error.message.includes('404')) {
                // No plan exists, try to generate one
                await this.generateLearningPlan();
                return;
            }
            
            console.error('Error loading learning plan:', error);
            UIHelpers.hideLoading('loadingState');
            UIHelpers.showError('Failed to load your learning plan. Please try again.');
        }
    }

    async generateLearningPlan() {
        try {
            UIHelpers.showLoading('loadingState', 'Generating your personalized plan...');
            
            const data = await apiClient.generateLearningPlan(this.userId);
            this.learningPlan = data.learning_plan;
            this.progress = { completed_days: [], current_day: 1, completion_percentage: 0 };

            UIHelpers.hideLoading('loadingState');
            this.displayLearningPlan();
            
        } catch (error) {
            console.error('Error generating learning plan:', error);
            UIHelpers.hideLoading('loadingState');
            UIHelpers.showError('Failed to generate your learning plan. Please ensure you have completed an assessment.');
        }
    }

    displayLearningPlan() {
        document.getElementById('planContent').style.display = 'block';

        // Update plan header
        document.getElementById('planTitle').textContent = this.learningPlan.plan_title;
        document.getElementById('planSummary').textContent = this.learningPlan.plan_summary;
        document.getElementById('goalText').textContent = this.learningPlan.weekly_goal;

        // Update progress
        this.updateProgressDisplay();

        // Display daily tasks
        this.displayDailyTasks();

        // Display success metrics
        this.displaySuccessMetrics();
    }

    updateProgressDisplay() {
        const completedDays = this.progress.completed_days.length;
        const percentage = Math.round((completedDays / 7) * 100);
        
        // Update progress circle
        const progressCircle = document.getElementById('progressCircle');
        if (progressCircle) {
            progressCircle.style.setProperty('--progress', `${percentage * 3.6}deg`);
        }
        
        const progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = `${percentage}%`;
        }

        // Update progress status
        const statusText = completedDays === 0 ? 'Getting started...' :
                          completedDays === 7 ? 'Plan completed! 🎉' :
                          `${UIHelpers.formatProgress(completedDays, 7)} days completed`;
        
        const progressStatus = document.getElementById('progressStatus');
        if (progressStatus) {
            progressStatus.textContent = statusText;
        }

        // Update current day info
        const currentDayText = document.getElementById('currentDayText');
        if (currentDayText) {
            currentDayText.textContent = 
                this.progress.current_day > 7 ? 'Completed!' : `Day ${this.progress.current_day}`;
        }
    }

    displayDailyTasks() {
        const container = document.getElementById('dailyTasks');
        if (!container) return;
        
        container.innerHTML = '';

        this.learningPlan.daily_tasks.forEach(day => {
            const isCompleted = this.progress.completed_days.includes(day.day);
            const isCurrent = day.day === this.progress.current_day && !isCompleted;

            const dayCard = document.createElement('div');
            dayCard.className = `day-card ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`;

            dayCard.innerHTML = `
                <div class="day-header">
                    <div class="day-number">${day.day}</div>
                    <div class="day-title">
                        <h3>${day.title}</h3>
                        <div class="focus-area">Focus: ${day.focus_area}</div>
                    </div>
                    <button class="completion-btn ${isCompleted ? 'completed' : ''}" 
                            onclick="learningPlan.toggleDayCompletion(${day.day})"
                            ${isCompleted ? 'disabled' : ''}>
                        ${isCompleted ? '✓ Completed' : 'Mark Complete'}
                    </button>
                </div>
                <div class="tasks-list">
                    ${day.tasks.map(task => `<div class="task-item">${task}</div>`).join('')}
                </div>
                <div class="learning-objective">
                    <div class="objective-label">Learning Objective:</div>
                    <div class="objective-text">${day.learning_objective}</div>
                </div>
                <div class="estimated-time">⏱️ ${day.estimated_time}</div>
            `;

            container.appendChild(dayCard);
        });
    }

    displaySuccessMetrics() {
        const container = document.getElementById('metricsList');
        if (!container) return;
        
        container.innerHTML = '';

        this.learningPlan.success_metrics.forEach(metric => {
            const li = document.createElement('li');
            li.textContent = metric;
            container.appendChild(li);
        });
    }

    async toggleDayCompletion(dayNumber) {
        try {
            const data = await apiClient.updatePlanProgress(this.userId, dayNumber);
            this.progress = data.progress;

            // Update display
            this.updateProgressDisplay();
            this.displayDailyTasks();

            // Show completion message for day 7
            if (dayNumber === 7) {
                setTimeout(() => {
                    alert('🎉 Congratulations! You have completed your 7-day learning plan!');
                }, 500);
            }

        } catch (error) {
            console.error('Error updating progress:', error);
            alert('Failed to update progress. Please try again.');
        }
    }

    // Navigation helpers
    goToDashboard() {
        userManager.navigateToDashboard();
    }

    startPractice() {
        userManager.navigateToPractice();
    }
}

// Initialize learning plan when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.learningPlan = new LearningPlan();
    learningPlan.init();
});

// Export for potential use by other modules
window.LearningPlan = LearningPlan; 