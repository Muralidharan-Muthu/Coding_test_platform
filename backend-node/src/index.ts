import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);

// Add remaining routes as they are migrated:
// app.use('/api/admin', adminRoutes);
// app.use('/api/problems', problemsRoutes);
// ... etc.

app.get('/health', (req, res) => {
  res.json({ status: 'ok', framework: 'Node.js/Express' });
});

const PORT = process.env.PORT || 8000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Backend] Node.js server started on http://localhost:${PORT}`);
  });
}

export default app; // Export for Vercel Serverless Function compatibility
