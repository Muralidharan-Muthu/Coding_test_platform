/**
 * tableParser.js
 * Pure utility functions for parsing ASCII tables and SQL DDL/DML.
 */

/**
 * Parses an ASCII grid table (e.g. LeetCode style with +---+ borders and | cells)
 * into a structured object: { headers, rows }.
 */
export function parseAsciiTable(textBlock) {
  if (!textBlock) return null

  const lines = textBlock.split(/\r?\n/).map(l => l.trimEnd())
  const borderRegex = /^\+[-+=| ]+\+$/
  const rowRegex = /^\|.*\|$/

  let headerLine = null
  const dataRows = []
  let borderCount = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (borderRegex.test(trimmed)) {
      borderCount++
      continue
    }
    if (rowRegex.test(trimmed)) {
      // Split by '|' and trim each cell
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim())

      if (borderCount === 1 && headerLine === null) {
        headerLine = cells
      } else {
        dataRows.push(cells)
      }
    }
  }

  if (headerLine && headerLine.length > 0) {
    return {
      headers: headerLine,
      rows: dataRows
    }
  }

  return null
}

/**
 * Parses a string containing prose mixed with ASCII tables.
 * Returns an array of segment objects:
 * - { type: 'text', content: string }
 * - { type: 'table', title?: string, headers: string[], rows: string[][] }
 */
export function parseContentWithTables(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') return []

  const lines = rawContent.split(/\r?\n/)
  const segments = []
  let textBuffer = []
  let inTable = false
  let tableLines = []
  let potentialTitle = ''

  const borderRegex = /^\s*\+[-+=| ]+\+\s*$/
  const rowRegex = /^\s*\|.*\|\s*$/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (borderRegex.test(trimmed)) {
      if (!inTable) {
        inTable = true
        tableLines = [line]

        // Pop trailing blank lines from textBuffer
        while (textBuffer.length > 0 && !textBuffer[textBuffer.length - 1].trim()) {
          textBuffer.pop()
        }

        // Check if the previous line in textBuffer was a title/label
        if (textBuffer.length > 0) {
          const lastLine = textBuffer[textBuffer.length - 1].trim()
          const titlePattern = /^(Table:\s*[\w]+|[\w\s]+table:?|Input:?|Output:?|Example\s*\d+:?)$/i
          if (titlePattern.test(lastLine) || (lastLine && !lastLine.endsWith('.') && lastLine.length < 50)) {
            potentialTitle = lastLine
            textBuffer.pop() // Remove from regular text so it binds to the table
          }
        }

        // Flush remaining text
        if (textBuffer.length > 0) {
          segments.push({ type: 'text', content: textBuffer.join('\n') })
          textBuffer = []
        }
      } else {
        tableLines.push(line)
        // If the next line is not a table row or border, table ended
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : ''
        if (!rowRegex.test(nextLine) && !borderRegex.test(nextLine)) {
          inTable = false
          const parsed = parseAsciiTable(tableLines.join('\n'))
          if (parsed) {
            segments.push({
              type: 'table',
              title: potentialTitle || '',
              headers: parsed.headers,
              rows: parsed.rows
            })
          } else {
            segments.push({ type: 'text', content: tableLines.join('\n') })
          }
          tableLines = []
          potentialTitle = ''
        }
      }
    } else if (inTable) {
      tableLines.push(line)
    } else {
      textBuffer.push(line)
    }
  }

  // Flush remaining table if open
  if (inTable && tableLines.length > 0) {
    const parsed = parseAsciiTable(tableLines.join('\n'))
    if (parsed) {
      segments.push({
        type: 'table',
        title: potentialTitle || '',
        headers: parsed.headers,
        rows: parsed.rows
      })
    } else {
      textBuffer.push(...tableLines)
    }
  }

  // Flush text buffer
  if (textBuffer.length > 0) {
    segments.push({ type: 'text', content: textBuffer.join('\n') })
  }

  return segments
}

function cleanSqlValue(raw) {
  const trimmed = raw.trim()
  if (/^['"].*['"]$/.test(trimmed)) {
    return trimmed.slice(1, -1)
  }
  if (trimmed.toUpperCase() === 'NULL') return 'NULL'
  return trimmed
}

/**
 * Extracts table schema and sample data rows from SQL DDL and DML statements.
 * Supports:
 *   CREATE TABLE TableName (col1 type1, col2 type2, ...);
 *   INSERT INTO TableName VALUES (val1, val2), (val3, val4);
 */
export function parseSqlFromDdlDml(schemaSql, seedSql) {
  const result = {
    tableName: '',
    columns: [],
    columnTypes: {},
    rows: []
  }

  if (!schemaSql && !seedSql) return result

  // 1. Parse CREATE TABLE with balanced parentheses
  if (schemaSql && typeof schemaSql === 'string') {
    const tableHeaderMatch = schemaSql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([a-zA-Z_][\w]*)[`"']?\s*\(/i)
    if (tableHeaderMatch) {
      result.tableName = tableHeaderMatch[1]
      const startIndex = tableHeaderMatch.index + tableHeaderMatch[0].length

      let depth = 1
      let endIndex = -1
      for (let i = startIndex; i < schemaSql.length; i++) {
        if (schemaSql[i] === '(') depth++
        else if (schemaSql[i] === ')') {
          depth--
          if (depth === 0) {
            endIndex = i
            break
          }
        }
      }

      const body = endIndex !== -1 ? schemaSql.slice(startIndex, endIndex) : schemaSql.slice(startIndex)

      // Split column definitions by comma at depth 0
      const defs = []
      let current = ''
      let parenDepth = 0
      for (let i = 0; i < body.length; i++) {
        const char = body[i]
        if (char === '(') parenDepth++
        else if (char === ')') parenDepth--
        else if (char === ',' && parenDepth === 0) {
          defs.push(current.trim())
          current = ''
          continue
        }
        current += char
      }
      if (current.trim()) defs.push(current.trim())

      for (const def of defs) {
        const parts = def.trim().split(/\s+/)
        const colName = (parts[0] || '').replace(/[`"']/g, '')
        const colType = parts[1] || 'TEXT'
        const upper = colName.toUpperCase()
        if (['PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'CONSTRAINT'].some(k => upper.startsWith(k))) {
          continue
        }
        if (colName) {
          result.columns.push(colName)
          result.columnTypes[colName] = colType
        }
      }
    }
  }

  // 2. Parse INSERT INTO ... VALUES
  if (seedSql && typeof seedSql === 'string') {
    const tupleRegex = /\(([\s\S]*?)\)/g
    let match

    while ((match = tupleRegex.exec(seedSql)) !== null) {
      const tupleContent = match[1].trim()
      if (tupleContent.toUpperCase().includes('PRIMARY KEY') || tupleContent.toUpperCase().includes('VARCHAR')) {
        continue
      }

      const values = []
      let valBuffer = ''
      let inQuote = false
      let quoteChar = ''

      for (let i = 0; i < tupleContent.length; i++) {
        const char = tupleContent[i]
        if ((char === "'" || char === '"') && (i === 0 || tupleContent[i - 1] !== '\\')) {
          if (!inQuote) {
            inQuote = true
            quoteChar = char
          } else if (quoteChar === char) {
            inQuote = false
            quoteChar = ''
          }
        } else if (char === ',' && !inQuote) {
          values.push(cleanSqlValue(valBuffer))
          valBuffer = ''
          continue
        }
        valBuffer += char
      }
      if (valBuffer.trim()) {
        values.push(cleanSqlValue(valBuffer))
      }

      if (values.length > 0) {
        result.rows.push(values)
      }
    }
  }

  return result
}
