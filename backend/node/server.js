const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('../../frontend'));

// Reference answers stored in-memory for simplicity
const referenceAnswers = {
    '1': 'Technology has both simplified and complicated modern life. While it has automated many tasks and improved communication, it has also introduced new challenges like digital security concerns, information overload, and technological dependence. However, these complications are balanced by significant benefits in healthcare, education, and global connectivity. The key to managing technology is developing proper skills and establishing boundaries for its use.',
    // Add more reference answers as needed
};

// Original TOEFL submission endpoint
app.post('/submit', async (req, res) => {
    const { answer, questionId } = req.body;
    
    if (!answer || !questionId) {
        return res.status(400).json({ error: 'Answer and question ID are required' });
    }
    
    try {
        // Forward to Python backend with reference answer
        const response = await fetch('http://localhost:8000/analyze', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                userAnswer: answer,
                referenceAnswer: referenceAnswers[questionId] || '',
                questionId
            })
        });
        
        if (!response.ok) {
            throw new Error(`Python backend responded with ${response.status}`);
        }
        
        const feedback = await response.json();
        res.json(feedback);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Analysis failed', details: error.message });
    }
});

// WritePath API Proxies - User Profile Management
app.post('/api/writepath/profile', async (req, res) => {
    try {
        const response = await fetch('http://localhost:8000/api/writepath/profile', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(req.body)
        });
        
        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json(error);
        }
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error('Profile creation error:', error);
        res.status(500).json({ error: 'Profile creation failed', details: error.message });
    }
});

app.get('/api/writepath/profile/:userId', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:8000/api/writepath/profile/${req.params.userId}`);
        
        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json(error);
        }
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error('Profile retrieval error:', error);
        res.status(500).json({ error: 'Profile retrieval failed', details: error.message });
    }
});

app.put('/api/writepath/profile/:userId', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:8000/api/writepath/profile/${req.params.userId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(req.body)
        });
        
        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json(error);
        }
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Profile update failed', details: error.message });
    }
});

// WritePath API Proxies - Assessment
app.post('/api/writepath/assess', async (req, res) => {
    try {
        const response = await fetch('http://localhost:8000/api/writepath/assess', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(req.body)
        });
        
        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json(error);
        }
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error('Assessment error:', error);
        res.status(500).json({ error: 'Assessment failed', details: error.message });
    }
});

app.get('/api/writepath/results/:userId', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:8000/api/writepath/results/${req.params.userId}`);
        
        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json(error);
        }
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error('Results retrieval error:', error);
        res.status(500).json({ error: 'Results retrieval failed', details: error.message });
    }
});

// WritePath API Proxies - Learning Plans
app.post('/api/writepath/generate-plan', async (req, res) => {
    try {
        const response = await fetch('http://localhost:8000/api/writepath/generate-plan', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(req.body)
        });
        
        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json(error);
        }
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error('Learning plan generation error:', error);
        res.status(500).json({ error: 'Learning plan generation failed', details: error.message });
    }
});

app.get('/api/writepath/plan/:userId', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:8000/api/writepath/plan/${req.params.userId}`);
        
        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json(error);
        }
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error('Learning plan retrieval error:', error);
        res.status(500).json({ error: 'Learning plan retrieval failed', details: error.message });
    }
});

app.put('/api/writepath/plan/progress', async (req, res) => {
    try {
        const response = await fetch('http://localhost:8000/api/writepath/plan/progress', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(req.body)
        });
        
        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json(error);
        }
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error('Progress update error:', error);
        res.status(500).json({ error: 'Progress update failed', details: error.message });
    }
});

// Endpoint to serve the questions
app.get('/questions/:id', (req, res) => {
    const id = req.params.id;
    // In a real app, this would come from a database
    const questions = {
        '1': 'Do you agree or disagree with the following statement? Modern technology has made life more complicated. Use specific reasons and examples to support your answer.'
    };
    
    if (questions[id]) {
        res.json({ id, text: questions[id] });
    } else {
        res.status(404).json({ error: 'Question not found' });
    }
});

// Week 4: WriteNow Practice Framework APIs
app.get('/api/writenow/question/:userId', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:8000/api/writenow/question/${req.params.userId}`);
        
        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json(error);
        }
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error('Personalized question retrieval error:', error);
        res.status(500).json({ error: 'Failed to get personalized question', details: error.message });
    }
});

app.post('/api/writenow/feedback', async (req, res) => {
    try {
        const response = await fetch('http://localhost:8000/api/writenow/feedback', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(req.body)
        });
        
        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json(error);
        }
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error('Enhanced feedback error:', error);
        res.status(500).json({ error: 'Enhanced feedback failed', details: error.message });
    }
});

app.get('/api/writenow/sessions/:userId', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:8000/api/writenow/sessions/${req.params.userId}`);
        
        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json(error);
        }
        
        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error('Practice sessions retrieval error:', error);
        res.status(500).json({ error: 'Failed to get practice sessions', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Write Track Lite server running on port ${PORT}`)); 