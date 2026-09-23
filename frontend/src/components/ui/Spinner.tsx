import React from 'react'

interface SpinnerProps {
  size?: number
  label?: string
  fullPage?: boolean
  className?: string
}

/**
 * Modern LeetCode-style loading indicator using Tailwind CSS animations.
 */
export default function Spinner({ size = 40, label, fullPage = false, className = '' }: SpinnerProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 p-4 ${className}`} role="status" aria-live="polite">
      <span
        className="rounded-full border-2 border-slate-200 dark:border-[#3e3e3e] border-t-[#ffa116] dark:border-t-[#ffa116] animate-spin"
        style={{
          width: size,
          height: size,
          borderWidth: Math.max(2, Math.round(size / 10))
        }}
        aria-hidden="true"
      />
      {label && (
        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-[#b0b0b0] tracking-wide animate-pulse">
          {label}
        </p>
      )}
      <span className="sr-only">{label || 'Loading'}</span>
    </div>
  )

  if (!fullPage) return content

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-xs">
      {content}
    </div>
  )
}
