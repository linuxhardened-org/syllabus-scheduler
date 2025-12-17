import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Route imports
import courseRoutes from './routes/courses.js';
import planRoutes from './routes/plans.js';
import healthRoutes from './routes/health.js';
import jobRoutes from './routes/jobs.js';

// Service imports
import { connectQueue } from './services/queueService.js';

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
app.use('/api/jobs', jobRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '📚 Smart Study Planner API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      courses: '/api/courses',
      plans: '/api/plans',
      jobs: '/api/jobs'
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

    // Connect to RabbitMQ (background queue)
    connectQueue().then(connected => {
      if (connected) {
        console.log('✅ RabbitMQ queue ready');
      } else {
        console.log('⚠️ RabbitMQ not available - jobs will process immediately');
      }
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Ollama Host: ${process.env.OLLAMA_HOST || 'http://localhost:11434'}`);
      console.log(`🤖 AI Model: ${process.env.OLLAMA_MODEL || 'llama3.1'}`);
      console.log(`🐰 RabbitMQ: ${process.env.RABBITMQ_URL || 'amqp://localhost:5672'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
