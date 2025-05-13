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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Node server running on port ${PORT}`)); 