/**
 * Centralized Application Constants & Navigation Metadata
 */

export interface NavItem {
  label: string;
  href: string;
  activePaths: string[];
  children?: NavItem[];
}

export interface TestTypeConfig {
  label: string;
  description: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Assessment Dashboard',
    href: '/admin/dashboard/assessment',
    activePaths: ['/admin/dashboard', '/admin/dashboard/assessment', '/dashboard/assessment'],
  },
  {
    label: 'Questions',
    href: '/admin/questions/python_questions',
    activePaths: ['/admin/questions'],
  },
  {
    label: 'Manage Candidates',
    href: '/admin/otp',
    activePaths: ['/admin/otp'],
    children: [
      { label: 'Choose Test Type', href: '/admin/test-type', activePaths: ['/admin/test-type'] },
      { label: 'Send Mail', href: '/admin/send-mail', activePaths: ['/admin/send-mail'] },
    ],
  },
];

export const TEST_TYPES: Record<string, TestTypeConfig> = {
  both: {
    label: 'Python + SQL',
    description: 'Candidate gets both coding and SQL question sets.',
  },
  python: {
    label: 'Python Only',
    description: 'Candidate gets only Python coding questions.',
  },
  sql: {
    label: 'SQL Only',
    description: 'Candidate gets only SQL query questions.',
  },
  mcq: {
    label: 'MCQ Only',
    description: 'Candidate gets only multiple-choice questions.',
  },
  python_mcq: {
    label: 'Python + MCQ',
    description: 'Candidate gets Python coding questions and MCQ questions.',
  },
  sql_mcq: {
    label: 'SQL + MCQ',
    description: 'Candidate gets SQL query questions and MCQ questions.',
  },
  full: {
    label: 'Python + SQL + MCQ',
    description: 'Candidate gets Python, SQL, and MCQ question sets.',
  },
};

export const TEST_TYPE_ALIASES: Record<string, string> = {
  'python + sql': 'both',
  'mcq only': 'mcq',
  'mcq_only': 'mcq',
  'python + mcq': 'python_mcq',
  'python+mcq': 'python_mcq',
  'sql + mcq': 'sql_mcq',
  'sql+mcq': 'sql_mcq',
  'python + sql + mcq': 'full',
  'python+sql+mcq': 'full',
  'all': 'full',
};

export function normalizeTestType(testType?: string): string {
  const normalized = String(testType || 'both').trim().toLowerCase();
  const resolved = TEST_TYPE_ALIASES[normalized] || normalized;
  if (!TEST_TYPES[resolved]) return 'both';
  return resolved;
}

export const DIFFICULTY_OPTIONS = [
  { value: 'Easy', label: 'Easy', color: '#10b981' },
  { value: 'Medium', label: 'Medium', color: '#f59e0b' },
  { value: 'Hard', label: 'Hard', color: '#ef4444' },
];
