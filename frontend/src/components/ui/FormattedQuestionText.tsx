import React, { useState } from 'react'
import { FiCopy, FiCheck, FiCode } from 'react-icons/fi'

/**
 * Tokenizes and highlights code using Tailwind utility classes.
 */
function highlightCode(code: string, lang = 'python') {
  if (!code) return ''

  const tokens = [
    { type: 'comment', class: 'text-slate-500 italic', regex: /(#|--).*$/m },
    { type: 'string', class: 'text-emerald-400', regex: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/ },
    { type: 'keyword', class: 'text-[#ffa116] font-semibold', regex: /\b(def|class|return|if|elif|else|for|while|in|is|not|and|or|import|from|as|try|except|finally|with|pass|break|continue|lambda|yield|raise|global|assert|SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|TABLE|PRIMARY|KEY|JOIN|LEFT|RIGHT|INNER|GROUP|BY|ORDER|HAVING|LIMIT|VALUES)\b/i },
    { type: 'builtin', class: 'text-cyan-400', regex: /\b(print|len|range|enumerate|zip|map|filter|list|dict|set|tuple|int|str|float|bool|type|sum|min|max|sorted|reversed|input|open|append|pop|push|extend|keys|values|items)\b/ },
    { type: 'bool', class: 'text-amber-300 font-semibold', regex: /\b(True|False|None|true|false|null|NULL)\b/ },
    { type: 'number', class: 'text-purple-400', regex: /\b\d+(\.\d+)?\b/ },
  ]

  let cursor = 0
  let out = ''
  const len = code.length

  while (cursor < len) {
    let match: RegExpExecArray | null = null
    let matchedToken: typeof tokens[0] | null = null
    let minIndex = Infinity

    for (const t of tokens) {
      t.regex.lastIndex = 0
      const sub = code.slice(cursor)
      const m = t.regex.exec(sub)
      if (m && m.index < minIndex) {
        minIndex = m.index
        match = m
        matchedToken = t
      }
    }

    if (match && minIndex === 0 && matchedToken) {
      const escaped = match[0]
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      out += `<span class="${matchedToken.class}">${escaped}</span>`
      cursor += match[0].length
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

function parseQuestionSegments(rawText?: string) {
  if (!rawText) return []
  const text = String(rawText)

  if (text.includes('```')) {
    const segments: { type: 'text' | 'code'; text?: string; code?: string; lang?: string }[] = []
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

  const codeStartKeywords = /^([a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[\[\{("']|def |class |import |from |SELECT |CREATE TABLE |WITH |var |const |let |int |public |class Solution|print\()/m
  const match = codeStartKeywords.exec(text)

  if (match && match.index > 0) {
    const textPart = text.substring(0, match.index).trim()
    const codePart = text.substring(match.index).trim()
    return [
      { type: 'text' as const, text: textPart },
      { type: 'code' as const, code: codePart, lang: 'python' }
    ]
  }

  if (match && match.index === 0) {
    return [{ type: 'code' as const, code: text.trim(), lang: 'python' }]
  }

  return [{ type: 'text' as const, text }]
}

interface FormattedQuestionTextProps {
  text?: string
  className?: string
}

export default function FormattedQuestionText({ text, className = '' }: FormattedQuestionTextProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const segments = parseQuestionSegments(text)

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return (
            <div key={idx} className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-[#eff1f6] leading-relaxed">
              {seg.text?.split('\n\n').map((paragraph, pIdx) => (
                <p key={pIdx} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          )
        }

        const codeContent = seg.code || ''
        const lines = codeContent.split('\n')
        const isCopied = copiedIndex === idx

        return (
          <div key={idx} className="my-3 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900/95 dark:bg-[#111111] shadow-sm">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-950/80 dark:bg-[#181818] border-b border-slate-800 dark:border-[#282828] text-xs text-slate-400">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-400">
                <FiCode size={13} className="text-[#ffa116]" />
                <span>{seg.lang ? seg.lang.toUpperCase() : 'PYTHON'}</span>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 hover:text-slate-200 transition cursor-pointer"
                onClick={() => handleCopy(codeContent, idx)}
                title="Copy code"
              >
                {isCopied ? (
                  <>
                    <FiCheck size={12} className="text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <FiCopy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex font-mono text-xs overflow-x-auto">
              <div className="select-none px-3 py-3 text-right text-slate-600 bg-slate-950/40 dark:bg-[#0c0c0c] border-r border-slate-800/80 flex flex-col font-mono text-xs leading-relaxed" aria-hidden="true">
                {lines.map((_, lIdx) => (
                  <span key={lIdx}>{lIdx + 1}</span>
                ))}
              </div>
              <pre className="flex-1 p-3 overflow-x-auto font-mono text-xs text-slate-100 whitespace-pre leading-relaxed select-text">
                <code
                  dangerouslySetInnerHTML={{
                    __html: highlightCode(codeContent, seg.lang)
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