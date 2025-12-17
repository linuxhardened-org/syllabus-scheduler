import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';

    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    // Check Ollama connection
    let ollamaStatus = 'unknown';
    let ollamaModels = [];

    try {
        const response = await fetch(`${ollamaHost}/api/tags`);
        if (response.ok) {
            const data = await response.json();
            ollamaStatus = 'connected';
            ollamaModels = data.models?.map(m => m.name) || [];
        } else {
            ollamaStatus = 'error';
        }
    } catch (error) {
        ollamaStatus = 'disconnected';
    }

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            mongodb: mongoStatus,
            ollama: {
                status: ollamaStatus,
                host: ollamaHost,
                models: ollamaModels
            }
        }
    });
});

// Pull AI model endpoint
router.post('/pull-model', async (req, res) => {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const modelName = req.body.model || process.env.OLLAMA_MODEL || 'llama3.1';

    try {
        console.log(`🔄 Pulling model: ${modelName}...`);

        const response = await fetch(`${ollamaHost}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName, stream: false })
        });

        if (response.ok) {
            res.json({
                success: true,
                message: `Model ${modelName} pulled successfully`,
                model: modelName
            });
        } else {
            const error = await response.text();
            res.status(500).json({
                success: false,
                error: `Failed to pull model: ${error}`
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: `Ollama connection failed: ${error.message}`
        });
    }
});

export default router;
