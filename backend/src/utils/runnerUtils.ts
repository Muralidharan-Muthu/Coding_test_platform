/**
 * Utility functions for code runner output normalization and comparison
 */

export function normalizeOutput(text: string | null | undefined): string {
  if (text === null || text === undefined) return '';
  let str = String(text);
  // Normalize newline characters
  str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Trim trailing spaces from each line
  str = str.split('\n').map(l => l.trimEnd()).join('\n');
  // Collapse multiple empty lines
  str = str.replace(/\n{3,}/g, '\n\n');
  // Trim start and end
  return str.trim();
}

export function deepEqualValues(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-5;
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a === b;
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return a.trim() === b.trim() || a.trim().toLowerCase() === b.trim().toLowerCase();
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqualValues(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!deepEqualValues(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

export function parseJsonOrPythonLiteral(text: string): any {
  if (!text) return text;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}
  // Replace Python True/False/None with JSON true/false/null
  try {
    const jsonified = trimmed
      .replace(/'/g, '"')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null');
    return JSON.parse(jsonified);
  } catch {}
  return trimmed;
}

export function compareOutputs(actual: string, expected: string): boolean {
  const normAct = normalizeOutput(actual);
  const normExp = normalizeOutput(expected);
  if (normAct === normExp) return true;
  if (!normAct && !normExp) return true;
  if (!normAct || !normExp) return false;

  // Unquoted string comparison (e.g. 'babad' vs "babad" vs babad)
  const stripQuotes = (s: string) => s.replace(/^["']|["']$/g, '').trim();
  if (stripQuotes(normAct) === stripQuotes(normExp)) return true;

  // Whitespace-agnostic comparison
  if (normAct.replace(/\s+/g, '') === normExp.replace(/\s+/g, '')) return true;

  // Case-insensitive boolean comparison
  if (normAct.toLowerCase() === normExp.toLowerCase()) return true;

  // Deep comparison via parsed objects
  const parsedAct = parseJsonOrPythonLiteral(normAct);
  const parsedExp = parseJsonOrPythonLiteral(normExp);
  if (deepEqualValues(parsedAct, parsedExp)) return true;

  return false;
}

export function getVerdict(passed: number, total: number): 'Accepted' | 'Partial' | 'Failed' {
  if (total === 0) return 'Failed';
  if (passed === total) return 'Accepted';
  if (passed > 0) return 'Partial';
  return 'Failed';
}
