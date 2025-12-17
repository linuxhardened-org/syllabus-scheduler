import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Route imports
import courseRoutes from './routes/courses.js';
import planRoutes from './routes/plans.js';
import healthRoutes from './routes/health.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===========================================
// MIDDLEWARE
// ===========================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// ===========================================
// ROUTES
// ===========================================
app.use('/api/health', healthRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/plans', planRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '📚 Smart Study Planner API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      courses: '/api/courses',
      plans: '/api/plans'
    }
  });
});

// ===========================================
// ERROR HANDLING
// ===========================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// ===========================================
// DATABASE CONNECTION & SERVER START
// ===========================================
const startServer = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/study_planner';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Ollama Host: ${process.env.OLLAMA_HOST || 'http://localhost:11434'}`);
      console.log(`🤖 AI Model: ${process.env.OLLAMA_MODEL || 'llama3.1'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
