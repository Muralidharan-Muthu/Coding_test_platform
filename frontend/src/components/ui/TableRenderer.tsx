import React from 'react'
import { parseContentWithTables, parseSqlFromDdlDml, parseAsciiTable } from '../../utils/tableParser'
import './TableRenderer.css'

export { parseContentWithTables, parseSqlFromDdlDml, parseAsciiTable }

/**
 * Renders a single LeetCode-style data or schema table.
 */
export function StyledHtmlTable({ title, headers = [], rows = [], className = '' }) {
  if (!headers || headers.length === 0) return null

  return (
    <div className={`tr-table-block ${className}`}>
      {title && (
        <div className="tr-table-title">
          <span className="tr-title-dot" />
          <span>{title}</span>
        </div>
      )}
      <div className="tr-table-container">
        <table className="tr-styled-table">
          <thead>
            <tr>
              {headers.map((h, idx) => (
                <th key={idx}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>
                      {cell === null || cell === undefined || cell === 'NULL' ? (
                        <span className="tr-cell-null">null</span>
                      ) : (
                        String(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="tr-cell-empty">No rows</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Renders mixed text containing paragraphs and embedded ASCII grid tables.
 */
export function FormattedContent({ text, className = '' }) {
  if (!text) return null

  const segments = parseContentWithTables(text)

  return (
    <div className={`tr-formatted-content ${className}`}>
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
          <div key={idx} className="tr-prose-block">
            <pre className="tr-prose-text">{seg.content.trim()}</pre>
          </div>
        )
      })}
    </div>
  )
}

export default FormattedContent
