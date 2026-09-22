import { Application } from 'express';
import authRoutes from './auth';
import adminRoutes from './admin';
import problemsRoutes from './problems';
import proctoringRoutes from './proctoring';
import assessmentRoutes from './assessment';
import reportsRoutes from './reports';
import candidatesRoutes from './candidates';
import examRoutes from './exam';
import runnerRoutes from './runner';

/**
 * Register all application routes on the Express app
 */
export function registerRoutes(app: Application): void {
  // Authentication & Candidate Auth
  app.use('/auth', authRoutes);
  app.use('/', authRoutes);

  // Administrative Control
  app.use('/admin', adminRoutes);

  // Proctoring & Integrity Monitoring
  app.use('/proctoring', proctoringRoutes);
  app.use('/admin/proctoring', proctoringRoutes);

  // Assessment & Candidates API
  app.use('/api/assessment', assessmentRoutes);
  app.use('/api/reports/proctoring', reportsRoutes);
  app.use('/api/candidates', candidatesRoutes);

  // Exam Lifecycle & Candidate Test Delivery
  app.use('/exam', examRoutes);
  app.use('/', problemsRoutes);

  // Code Runner Execution Engine
  app.use('/', runnerRoutes);
}

export {
  authRoutes,
  adminRoutes,
  problemsRoutes,
  proctoringRoutes,
  assessmentRoutes,
  reportsRoutes,
  candidatesRoutes,
  examRoutes,
  runnerRoutes,
};

export default registerRoutes;
