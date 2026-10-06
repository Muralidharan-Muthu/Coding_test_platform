import { getProctoringReportsForDashboard } from '../src/services/assessmentService';

async function main() {
  const rows = await getProctoringReportsForDashboard({});
  const row = rows.find(d => d.name === 'Muralidharan');
  console.log('--- CANDIDATE PROCTORING SUMMARY ---');
  console.log('Candidate:', row?.name);
  console.log('Login:', row?.login_time);
  console.log('Submit:', row?.submit_time);
  console.log('Logs Summary:', row?.logs_summary);
  console.log('Aggregated Logs:', JSON.stringify(row?.logs, null, 2));
}

main().catch(console.error);
