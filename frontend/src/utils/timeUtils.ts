/**
 * Time Utilities - Seconds as Primary Standard
 * Converts all time representations to/from SECONDS and formats as HH:MM:SS.
 */

export function normalizeToSeconds(val, isCodingProblem = false) {
  const num = Number(val);
  if (!num || isNaN(num) || num <= 0) return isCodingProblem ? 600 : 30;
  // If a coding problem has a small number <= 60, it was legacy minutes (e.g. 10, 15, 20, 30)
  if (isCodingProblem && num <= 60) {
    return num * 60;
  }
  return num;
}

export function formatTimeHHMMSS(seconds, isCodingProblem = false) {
  const totalSec = normalizeToSeconds(seconds, isCodingProblem);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export function formatTimeWithLabel(seconds, isCodingProblem = false) {
  const totalSec = normalizeToSeconds(seconds, isCodingProblem);
  const hhmmss = formatTimeHHMMSS(totalSec, false);
  if (totalSec >= 3600) {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    return `${hhmmss} (${hrs} hr${hrs > 1 ? 's' : ''}${mins > 0 ? ` ${mins} min` : ''})`;
  }
  if (totalSec >= 60) {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${hhmmss} (${mins} min${mins > 1 ? 's' : ''}${secs > 0 ? ` ${secs}s` : ''})`;
  }
  return `${hhmmss} (${totalSec}s)`;
}

export function formatTimeChip(seconds, isCodingProblem = false) {
  const totalSec = normalizeToSeconds(seconds, isCodingProblem);
  return formatTimeHHMMSS(totalSec, false);
}

export const formatSeconds = formatTimeHHMMSS;