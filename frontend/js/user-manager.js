/**
 * Write Track Lite - User Manager Module
 * Handles user identification, persistence, and common user operations
 */

class UserManager {
    constructor() {
        this.userId = null;
        this.userProfile = null;
        this.storageKey = 'writetrack_user_id';
    }

    // Initialize user from URL params or localStorage
    init() {
        const urlParams = new URLSearchParams(window.location.search);
        this.userId = urlParams.get('user_id') || localStorage.getItem(this.storageKey);
        
        if (this.userId) {
            this.persistUserId(this.userId);
        }
        
        return this.userId;
    }

    // Persist user ID to localStorage
    persistUserId(userId) {
        this.userId = userId;
        localStorage.setItem(this.storageKey, userId);
    }

    // Get current user ID
    getUserId() {
        return this.userId;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.userId;
    }

    // Load user profile
    async loadProfile() {
        if (!this.userId) return null;

        try {
            this.userProfile = await apiClient.getUserProfile(this.userId);
            return this.userProfile;
        } catch (error) {
            console.error('Failed to load user profile:', error);
            return null;
        }
    }

    // Get cached user profile
    getProfile() {
        return this.userProfile;
    }

    // Navigation helpers with user context
    navigateToAssessment() {
        const url = this.userId ? `/assessment.html?user_id=${this.userId}` : '/assessment.html';
        window.location.href = url;
    }

    navigateToDashboard() {
        const url = this.userId ? `/dashboard.html?user_id=${this.userId}` : '/dashboard.html';
        window.location.href = url;
    }

    navigateToLearningPlan() {
        const url = this.userId ? `/writepath/plan.html?user_id=${this.userId}` : '/writepath/plan.html';
        window.location.href = url;
    }

    navigateToPractice() {
        const url = this.userId ? `/index.html?user_id=${this.userId}` : '/index.html';
        window.location.href = url;
    }

    // Validation helper
    requireAuthentication(redirectToAssessment = true) {
        if (!this.userId) {
            if (redirectToAssessment) {
                alert('Please complete an assessment first to access this feature.');
                this.navigateToAssessment();
            }
            return false;
        }
        return true;
    }

    // Clear user data (logout)
    logout() {
        this.userId = null;
        this.userProfile = null;
        localStorage.removeItem(this.storageKey);
    }
}

// Create global user manager instance
window.userManager = new UserManager(); 