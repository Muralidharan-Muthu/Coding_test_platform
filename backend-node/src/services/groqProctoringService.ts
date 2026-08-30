/**
 * Groq Vision AI Proctoring Service
 * Multi-Model Sequential Round-Robin Architecture
 *
 * Rotates across top Groq models (30 RPM each) to distribute load,
 * maximize throughput, and eliminate rate-limit bottlenecks:
 *   1. qwen/qwen3.6-27b
 *   2. qwen/qwen3.8-27b
 *   3. openai/gpt-oss-20b
 *   4. openai/gpt-oss-120b
 *   5. groq/compound
 *   6. groq/compound-mini
 */

import prisma from '../db/prisma';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Sequential Model Pool for round-robin rotation
const MODEL_POOL = [
  'qwen/qwen3.6-27b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'groq/compound',
  'groq/compound-mini',
];

let currentModelIndex = 0;

function getNextModel(): string {
  const model = MODEL_POOL[currentModelIndex];
  currentModelIndex = (currentModelIndex + 1) % MODEL_POOL.length;
  return model;
}

export interface GroqFraudAnalysis {
  face_count: number;
  mobile_phone_detected: boolean;
  headphones_detected: boolean;
  notes_or_book_detected: boolean;
  looking_away: boolean;
  suspicious_object: string | null;
  risk_score: number; // 0–100
  risk_level: 'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  model_used: string;
  timestamp: string;
}

const ANALYSIS_PROMPT = `You are an AI exam proctor. Analyze this webcam snapshot of a candidate taking an online test.
Evaluate for any cheating behavior:
1. Count visible faces.
2. Check for mobile phones, tablets, or extra screens.
3. Check for headphones, earbuds, or airpods.
4. Check for notes, papers, or textbooks.
5. Check if the candidate is looking away from the screen.

Output your final verdict as a clean JSON object with these keys:
{
  "face_count": <integer>,
  "mobile_phone_detected": <boolean>,
  "headphones_detected": <boolean>,
  "notes_or_book_detected": <boolean>,
  "looking_away": <boolean>,
  "suspicious_object": <string or null>,
  "risk_score": <number 0-100>,
  "reason": "<one concise sentence explaining findings>"
}
Do not include any text after the JSON object.`;

/**
 * Extract JSON substring from model output (handling think tags or markdown).
 */
function extractJson(text: string): any {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonSub = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSub);
    } catch {
      // Fallback
    }
  }

  const m = text.match(/\{[\s\S]*?\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }

  return {};
}

/**
 * Call Groq API with automatic model rotation and failover.
 */
async function callGroqWithFailover(base64Image: string, preferredModel?: string): Promise<{ data: any; modelUsed: string }> {
  const imageUrl = base64Image.startsWith('data:')
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`;

  const attempts = MODEL_POOL.length;
  let lastError: any = null;

  // Start with the preferred or next round-robin model
  let startIndex = preferredModel ? MODEL_POOL.indexOf(preferredModel) : currentModelIndex;
  if (startIndex === -1) startIndex = currentModelIndex;

  for (let i = 0; i < attempts; i++) {
    const modelIndex = (startIndex + i) % MODEL_POOL.length;
    const model = MODEL_POOL[modelIndex];

    try {
      const requestBody = {
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: ANALYSIS_PROMPT },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      };

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[GroqProctoring] Model ${model} returned ${response.status}: ${errText}. Attempting failover...`);
        lastError = new Error(`Groq API (${model}) returned ${response.status}: ${errText}`);
        continue; // Try next model in sequence
      }

      const resData = await response.json();
      currentModelIndex = (modelIndex + 1) % MODEL_POOL.length; // Advance pointer for next round
      return { data: resData, modelUsed: model };
    } catch (err: any) {
      console.warn(`[GroqProctoring] Model ${model} failed: ${err.message}. Attempting failover...`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Groq proctoring models in pool failed.');
}

/**
 * Analyze a webcam frame using sequential round-robin Groq AI.
 */
export async function analyzeFrame(base64Image: string): Promise<GroqFraudAnalysis> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured in the server environment.');
  }

  const { data, modelUsed } = await callGroqWithFailover(base64Image);
  const content = data.choices?.[0]?.message?.content || '{}';
  const parsed = extractJson(content);

  const riskScore = Math.min(100, Math.max(0, Number(parsed.risk_score) || 0));
  let riskLevel: GroqFraudAnalysis['risk_level'] = 'CLEAN';
  if (riskScore >= 80) riskLevel = 'CRITICAL';
  else if (riskScore >= 60) riskLevel = 'HIGH';
  else if (riskScore >= 40) riskLevel = 'MEDIUM';
  else if (riskScore >= 20) riskLevel = 'LOW';

  return {
    face_count: parsed.face_count !== undefined ? Number(parsed.face_count) : 1,
    mobile_phone_detected: Boolean(parsed.mobile_phone_detected),
    headphones_detected: Boolean(parsed.headphones_detected),
    notes_or_book_detected: Boolean(parsed.notes_or_book_detected),
    looking_away: Boolean(parsed.looking_away),
    suspicious_object: parsed.suspicious_object || null,
    risk_score: riskScore,
    risk_level: riskLevel,
    reason: String(parsed.reason || 'Frame scanned by AI: Normal behavior.'),
    model_used: modelUsed,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Analyze frame AND persist the result as a proctoring log & event.
 */
export async function analyzeAndLogFrame(
  base64Image: string,
  candidateId: string,
  sessionId: string
): Promise<GroqFraudAnalysis> {
  const analysis = await analyzeFrame(base64Image);

  try {
    const flags: string[] = [];
    if (analysis.mobile_phone_detected) flags.push('📱 Phone detected');
    if (analysis.headphones_detected) flags.push('🎧 Headphones detected');
    if (analysis.notes_or_book_detected) flags.push('📄 Notes detected');
    if (analysis.looking_away) flags.push('👀 Looking away');
    if (analysis.face_count === 0) flags.push('❌ No face');
    if (analysis.face_count > 1) flags.push(`👥 ${analysis.face_count} faces`);
    if (analysis.suspicious_object) flags.push(`⚠️ ${analysis.suspicious_object}`);
    const msg = `[AI Risk ${analysis.risk_score}/100 | ${analysis.model_used}] ${flags.length > 0 ? flags.join(' | ') : 'Clean'} - ${analysis.reason}`;

    // Normalize candidate_id so both "10" and "CAND_10" match
    const rawId = String(candidateId || '').replace(/^CAND_/i, '');
    const candIdFull = rawId ? `CAND_${rawId}` : candidateId;

    await prisma.proctoringLog.create({
      data: {
        exam_id: sessionId,
        candidate_id: candIdFull,
        violation_type: `AI_SCAN_${analysis.risk_level}`,
        message: msg,
        timestamp: new Date(),
      },
    });
  } catch (err) {
    console.error('[GroqProctoring] Failed to persist log:', err);
  }

  if (analysis.risk_score >= 60) {
    try {
      let evType = 'SUSPICIOUS_ACTIVITY';
      if (analysis.mobile_phone_detected) evType = 'MOBILE_PHONE_DETECTED';
      else if (analysis.face_count > 1) evType = 'MULTIPLE_FACES';
      else if (analysis.face_count === 0) evType = 'NO_FACE_DETECTED';
      else if (analysis.headphones_detected) evType = 'HEADPHONES_DETECTED';
      else if (analysis.notes_or_book_detected) evType = 'NOTES_DETECTED';
      else if (analysis.looking_away) evType = 'LOOKING_AWAY';

      await prisma.proctoringEventRecord.create({
        data: {
          session_id: sessionId,
          type: evType,
          severity: analysis.risk_level,
          timestamp: new Date().toISOString(),
          duration: 0,
          metadata: JSON.stringify(analysis),
          created_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('[GroqProctoring] Failed to persist event:', err);
    }
  }

  return analysis;
}