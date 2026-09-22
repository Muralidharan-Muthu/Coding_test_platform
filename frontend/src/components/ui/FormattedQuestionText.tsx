import React, { useState } from 'react'
import { FiCopy, FiCheck, FiCode } from 'react-icons/fi'
import './FormattedQuestionText.css'

/**
 * Tokenizes and highlights code without mangling HTML tags.
 */
function highlightCode(code, lang = 'python') {
  if (!code) return ''

  // Token definition
  const tokens = [
    { type: 'comment', regex: /(#|--).*$/m },
    { type: 'string', regex: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/ },
    { type: 'keyword', regex: /\b(def|class|return|if|elif|else|for|while|in|is|not|and|or|import|from|as|try|except|finally|with|pass|break|continue|lambda|yield|raise|global|assert|SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|TABLE|PRIMARY|KEY|JOIN|LEFT|RIGHT|INNER|GROUP|BY|ORDER|HAVING|LIMIT|VALUES)\b/i },
    { type: 'builtin', regex: /\b(print|len|range|enumerate|zip|map|filter|list|dict|set|tuple|int|str|float|bool|type|sum|min|max|sorted|reversed|input|open|append|pop|push|extend|keys|values|items)\b/ },
    { type: 'bool', regex: /\b(True|False|None|true|false|null|NULL)\b/ },
    { type: 'number', regex: /\b\d+(\.\d+)?\b/ },
  ]

  let cursor = 0
  let out = ''
  const len = code.length

  while (cursor < len) {
    let match = null
    let matchType = null
    let minIndex = Infinity

    for (const t of tokens) {
      t.regex.lastIndex = 0
      const sub = code.slice(cursor)
      const m = t.regex.exec(sub)
      if (m && m.index < minIndex) {
        minIndex = m.index
        match = m[0]
        matchType = t.type
      }
    }

    if (match && minIndex === 0) {
      const escaped = match
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      out += `<span class="fqt-${matchType}">${escaped}</span>`
      cursor += match.length
    } else if (match && minIndex > 0) {
      const plain = code.slice(cursor, cursor + minIndex)
      out += plain
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      cursor += minIndex
    } else {
      const rest = code.slice(cursor)
      out += rest
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      cursor = len
    }
  }

  return out
}

/**
 * Intelligent Code Extraction:
 * Splits question text into plain prose vs code block.
 */
function parseQuestionSegments(rawText) {
  if (!rawText) return []
  const text = String(rawText)

  // 1. Markdown code blocks ``` ... ```
  if (text.includes('```')) {
    const segments = []
    const parts = text.split(/(```[\s\S]*?```)/g)
    parts.forEach((part) => {
      if (!part.trim()) return
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).split('\n')
        let lang = 'python'
        let codeLines = lines
        if (lines[0] && /^[a-zA-Z0-9_-]+$/.test(lines[0].trim())) {
          lang = lines[0].trim().toLowerCase()
          codeLines = lines.slice(1)
        }
        segments.push({ type: 'code', code: codeLines.join('\n').trim(), lang })
      } else {
        segments.push({ type: 'text', text: part })
      }
    })
    return segments
  }

  // 2. Intelligent Code Extraction: detect code block inside plain text
  // Looks for patterns like "def ", "class ", "numbers = [", "x = ", "SELECT ", "import ", etc.
  const codeStartKeywords = /^([a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[\[\{("']|def |class |import |from |SELECT |CREATE TABLE |WITH |var |const |let |int |public |class Solution|print\()/m
  const match = codeStartKeywords.exec(text)

  if (match && match.index > 0) {
    const textPart = text.substring(0, match.index).trim()
    const codePart = text.substring(match.index).trim()
    return [
      { type: 'text', text: textPart },
      { type: 'code', code: codePart, lang: 'python' }
    ]
  }

  if (match && match.index === 0) {
    return [{ type: 'code', code: text.trim(), lang: 'python' }]
  }

  return [{ type: 'text', text }]
}

export default function FormattedQuestionText({ text, className = '' }) {
  const [copiedIndex, setCopiedIndex] = useState(null)
  const segments = parseQuestionSegments(text)

  const handleCopy = (code, idx) => {
    navigator.clipboard.writeText(code)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className={`fqt-container ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return (
            <div key={idx} className="fqt-prose">
              {seg.text.split('\n\n').map((paragraph, pIdx) => (
                <p key={pIdx} className="fqt-paragraph">
                  {paragraph}
                </p>
              ))}
            </div>
          )
        }

        const lines = seg.code.split('\n')
        const isCopied = copiedIndex === idx

        return (
          <div key={idx} className="fqt-code-card">
            <div className="fqt-code-header">
              <div className="fqt-code-lang-tag">
                <FiCode size={13} />
                <span>{seg.lang ? seg.lang.toUpperCase() : 'PYTHON'}</span>
              </div>
              <button
                type="button"
                className="fqt-code-copy-btn"
                onClick={() => handleCopy(seg.code, idx)}
                title="Copy code"
              >
                {isCopied ? (
                  <>
                    <FiCheck size={12} style={{ color: '#34d399' }} />
                    <span style={{ color: '#34d399' }}>Copied</span>
                  </>
                ) : (
                  <>
                    <FiCopy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="fqt-code-body">
              <div className="fqt-line-numbers" aria-hidden="true">
                {lines.map((_, lIdx) => (
                  <span key={lIdx}>{lIdx + 1}</span>
                ))}
              </div>
              <pre className="fqt-pre">
                <code
                  dangerouslySetInnerHTML={{
                    __html: highlightCode(seg.code, seg.lang)
                  }}
                />
              </pre>
            </div>
          </div>
        )
      })}
    </div>
  )
}