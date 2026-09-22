import express from 'express';
import cors from 'cors';
import config from './config';
import { registerRoutes } from './routes';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Base Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    framework: 'Node.js/Express',
    env: config.env,
    timestamp: new Date().toISOString(),
  });
});

// Register all modular API routes
registerRoutes(app);

// Centralized Error Handling Middleware
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[Backend] Node.js server started on http://localhost:${config.port}`);
});

export default app;
