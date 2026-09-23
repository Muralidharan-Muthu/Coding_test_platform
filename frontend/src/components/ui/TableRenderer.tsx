import React from 'react'
import { parseContentWithTables, parseSqlFromDdlDml, parseAsciiTable } from '../../utils/tableParser'

export { parseContentWithTables, parseSqlFromDdlDml, parseAsciiTable }

interface StyledHtmlTableProps {
  title?: string
  headers: string[]
  rows: any[][]
  className?: string
}

/**
 * Renders a single LeetCode-style data or schema table.
 */
export function StyledHtmlTable({ title, headers = [], rows = [], className = '' }: StyledHtmlTableProps) {
  if (!headers || headers.length === 0) return null

  return (
    <div className={`my-3 space-y-1.5 ${className}`}>
      {title && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-[#eff1f6]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffa116]" />
          <span>{title}</span>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#3e3e3e] bg-white dark:bg-[#202020] shadow-xs">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-[#3e3e3e] text-[11px] font-semibold text-slate-600 dark:text-[#eff1f6] uppercase tracking-wider">
              {headers.map((h, idx) => (
                <th key={idx} className="py-2.5 px-3 border-r border-slate-200 dark:border-[#3e3e3e] last:border-r-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#333333]">
            {rows.length > 0 ? (
              rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-slate-50/50 dark:hover:bg-[#282828]/50 transition">
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-2 px-3 text-slate-700 dark:text-[#eff1f6] border-r border-slate-100 dark:border-[#2a2a2a] last:border-r-0">
                      {cell === null || cell === undefined || cell === 'NULL' ? (
                        <span className="italic text-slate-400 font-sans">null</span>
                      ) : (
                        String(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="py-4 text-center text-slate-400 italic">
                  No rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface FormattedContentProps {
  text?: string
  className?: string
}

/**
 * Renders mixed text containing paragraphs and embedded ASCII grid tables.
 */
export function FormattedContent({ text, className = '' }: FormattedContentProps) {
  if (!text) return null

  const segments = parseContentWithTables(text)

  return (
    <div className={`space-y-3 ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'table') {
          return (
            <StyledHtmlTable
              key={idx}
              title={seg.title}
              headers={seg.headers}
              rows={seg.rows}
            />
          )
        }
        return (
          <div key={idx} className="text-xs leading-relaxed text-slate-700 dark:text-[#eff1f6] font-sans whitespace-pre-wrap">
            <pre className="font-mono text-xs whitespace-pre-wrap text-slate-700 dark:text-[#eff1f6] bg-slate-50 dark:bg-[#1a1a1a] p-3 rounded-xl border border-slate-200 dark:border-[#3e3e3e]">
              {seg.content.trim()}
            </pre>
          </div>
        )
      })}
    </div>
  )
}

export default FormattedContent
