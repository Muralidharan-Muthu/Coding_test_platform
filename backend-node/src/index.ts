import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import problemsRoutes from './routes/problems';
import proctoringRoutes from './routes/proctoring';
import assessmentRoutes from './routes/assessment';
import reportsRoutes from './routes/reports';
import candidatesRoutes from './routes/candidates';
import examRoutes from './routes/exam';

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/auth', authRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/proctoring', proctoringRoutes);
app.use('/admin/proctoring', proctoringRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/reports/proctoring', reportsRoutes);
app.use('/api/candidates', candidatesRoutes);
app.use('/exam', examRoutes);
app.use('/', problemsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', framework: 'Node.js/Express' });
});

// Server entry point - updated with random problem routes and professional email templates
const PORT = process.env.PORT || 8000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Backend] Node.js server started on http://localhost:${PORT}`);
  });
}

export default app;

