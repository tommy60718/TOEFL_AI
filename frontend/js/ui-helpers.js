/**
 * Write Track Lite - UI Helpers Module
 * Common UI patterns, loading states, error handling, and formatting
 */

class UIHelpers {
    // Loading state management
    static showLoading(elementId, message = 'Loading...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
            const messageEl = element.querySelector('.loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }

    static hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    }

    // Error state management
    static showError(message, elementId = 'errorState') {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            const messageEl = errorElement.querySelector('p') || errorElement;
            messageEl.textContent = message;
            errorElement.style.display = 'block';
        } else {
            alert(message); // Fallback
        }
    }

    static hideError(elementId = 'errorState') {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    }

    // Button state management
    static setButtonLoading(buttonId, loadingText = 'Processing...') {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
        }
    }

    static resetButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = false;
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }
        }
    }

    // Progress bar updates
    static updateProgress(elementId, percentage) {
        const progressBar = document.getElementById(elementId);
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    // Form validation helpers
    static validateForm(formData) {
        const errors = [];

        if (!formData.userType) {
            errors.push('Please select your writing focus area.');
        }

        if (!formData.goals || formData.goals.length === 0) {
            errors.push('Please select at least one learning goal.');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static validateWritingSample(text, minWords = 50) {
        if (!text.trim()) {
            return { isValid: false, error: 'Please write a response to the prompt.' };
        }

        const wordCount = text.trim().split(/\s+/).length;
        if (wordCount < minWords) {
            return { 
                isValid: false, 
                error: `Please write at least ${minWords} words for a meaningful assessment.` 
            };
        }

        return { isValid: true };
    }

    // Data formatting helpers
    static formatScore(score, maxScore = 30) {
        return `${score}/${maxScore}`;
    }

    static formatLevel(level) {
        return level ? level.charAt(0).toUpperCase() + level.slice(1) : 'Not assessed';
    }

    static formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return 'Unknown date';
        }
    }

    static formatProgress(completed, total) {
        return `${completed}/${total}`;
    }

    // Content display helpers
    static renderList(items, listType = 'ul') {
        if (!items || items.length === 0) return '';
        
        const listItems = items.map(item => {
            const text = typeof item === 'string' ? item : 
                        (item.text || item.message || JSON.stringify(item));
            return `<li>${text}</li>`;
        }).join('');
        
        return `<${listType}>${listItems}</${listType}>`;
    }

    static renderInfoItem(label, value) {
        return `
            <div class="info-item">
                <span class="label">${label}:</span>
                <span class="value">${value}</span>
            </div>
        `;
    }

    // Assessment results formatting
    static renderAssessmentResults(results) {
        return `
            <div style="margin-bottom: 30px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 3rem; font-weight: bold; color: #667eea;">
                        ${this.formatScore(results.proficiency_score)}
                    </div>
                    <div style="font-size: 1.2rem; color: #666; text-transform: capitalize;">
                        ${this.formatLevel(results.proficiency_level)} Level
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <div style="background: #e8f5e8; padding: 20px; border-radius: 10px;">
                    <h4 style="color: #2e7d32; margin-bottom: 15px;">✓ Your Strengths</h4>
                    ${this.renderList(results.strengths)}
                </div>
                
                <div style="background: #fff3e0; padding: 20px; border-radius: 10px;">
                    <h4 style="color: #f57c00; margin-bottom: 15px;">⚡ Areas to Focus</h4>
                    ${this.renderList(results.weak_areas.map(area => 
                        area.charAt(0).toUpperCase() + area.slice(1)
                    ))}
                </div>
            </div>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h4 style="margin-bottom: 15px;">📋 Recommended Next Steps</h4>
                ${this.renderList(results.recommendations, 'ol')}
            </div>
        `;
    }

    // Feedback formatting
    static renderFeedback(feedbackData, isPersonalized = false) {
        let correctionsHTML = '';
        if (feedbackData.corrections && feedbackData.corrections.length > 0) {
            correctionsHTML = `
                <div class="feedback-list">
                    <h4>✏️ Corrections</h4>
                    ${this.renderList(feedbackData.corrections)}
                </div>
            `;
        }

        const suggestionsHTML = `
            <div class="feedback-list">
                <h4>💡 Suggestions for Improvement</h4>
                ${this.renderList(feedbackData.suggestions)}
            </div>
        `;

        let personalizedSection = '';
        if (isPersonalized) {
            let personalizedTipsHTML = '';
            if (feedbackData.personalized_tips) {
                personalizedTipsHTML = `
                    <div class="feedback-list">
                        <h4>🎯 Personalized Tips</h4>
                        ${this.renderList(feedbackData.personalized_tips)}
                    </div>
                `;
            }

            let progressNotesHTML = '';
            if (feedbackData.progress_notes) {
                progressNotesHTML = `
                    <div class="feedback-list">
                        <h4>📈 Progress Notes</h4>
                        <p style="color: #4b5563; line-height: 1.6;">${feedbackData.progress_notes}</p>
                    </div>
                `;
            }

            personalizedSection = personalizedTipsHTML + progressNotesHTML;
        }

        return `
            <div class="feedback-content">
                <h3>📊 ${isPersonalized ? 'Personalized ' : ''}AI Feedback Results</h3>
                <div class="score">Score: ${this.formatScore(feedbackData.score)}</div>
                ${correctionsHTML}
                ${suggestionsHTML}
                ${personalizedSection}
            </div>
        `;
    }

    // Timer utilities
    static createTimer(callback, interval = 1000) {
        let seconds = 0;
        const timer = setInterval(() => {
            seconds++;
            if (callback) callback(seconds);
        }, interval);
        
        return {
            seconds: () => seconds,
            stop: () => clearInterval(timer)
        };
    }

    // Smooth scroll helper
    static scrollToElement(elementId, behavior = 'smooth') {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior, block: 'start' });
        }
    }

    // Generic error handler for async operations
    static async handleAsyncOperation(operation, options = {}) {
        const {
            loadingElementId,
            buttonId,
            errorMessage = 'An error occurred. Please try again.',
            successCallback,
            errorCallback
        } = options;

        try {
            if (loadingElementId) this.showLoading(loadingElementId);
            if (buttonId) this.setButtonLoading(buttonId);

            const result = await operation();
            
            if (successCallback) successCallback(result);
            return result;

        } catch (error) {
            console.error('Async operation failed:', error);
            
            if (errorCallback) {
                errorCallback(error);
            } else {
                this.showError(errorMessage);
            }
            
            throw error;

        } finally {
            if (loadingElementId) this.hideLoading(loadingElementId);
            if (buttonId) this.resetButton(buttonId);
        }
    }
}

// Make UIHelpers globally available
window.UIHelpers = UIHelpers; 