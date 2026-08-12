import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import problemsRoutes from './routes/problems';

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', problemsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', framework: 'Node.js/Express' });
});

const PORT = process.env.PORT || 8000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Backend] Node.js server started on http://localhost:${PORT}`);
  });
}

export default app;
