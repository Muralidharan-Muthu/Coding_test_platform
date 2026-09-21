import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseAsciiTable,
  parseContentWithTables,
  parseSqlFromDdlDml
} from '../../utils/tableParser.js'

describe('TableRenderer & ASCII Table Parser Tests', () => {
  it('should parse an ASCII grid table into headers and rows', () => {
    const tableText = `+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| product_id  | int     |
| low_fats    | enum    |
| recyclable  | enum    |
+-------------+---------+`

    const result = parseAsciiTable(tableText)
    assert.ok(result)
    assert.deepEqual(result.headers, ['Column Name', 'Type'])
    assert.equal(result.rows.length, 3)
    assert.deepEqual(result.rows[0], ['product_id', 'int'])
    assert.deepEqual(result.rows[1], ['low_fats', 'enum'])
    assert.deepEqual(result.rows[2], ['recyclable', 'enum'])
  })

  it('should parse content mixed with text, schema grid, and sample input/output grids', () => {
    const content = `Table: Products

+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| product_id  | int     |
| low_fats    | enum    |
+-------------+---------+
product_id is the primary key.

Write a query to find low fat products.

Input: 
Products table:
+-------------+----------+
| product_id  | low_fats |
+-------------+----------+
| 0           | Y        |
| 1           | N        |
+-------------+----------+

Output:
+-------------+
| product_id  |
+-------------+
| 0           |
+-------------+
Explanation: Product 0 is low fat.`

    const segments = parseContentWithTables(content)
    assert.ok(segments.length >= 3)

    const tableSegments = segments.filter(s => s.type === 'table')
    assert.equal(tableSegments.length, 3)

    // Table 1: Schema
    assert.deepEqual(tableSegments[0].headers, ['Column Name', 'Type'])
    assert.equal(tableSegments[0].rows.length, 2)
    assert.equal(tableSegments[0].title, 'Table: Products')

    // Table 2: Input
    assert.deepEqual(tableSegments[1].headers, ['product_id', 'low_fats'])
    assert.equal(tableSegments[1].rows.length, 2)
    assert.ok(tableSegments[1].title.includes('Products table'))

    // Table 3: Output
    assert.deepEqual(tableSegments[2].headers, ['product_id'])
    assert.equal(tableSegments[2].rows.length, 1)
    assert.equal(tableSegments[2].title, 'Output:')
  })

  it('should extract table name, columns, and rows from SQL DDL and DML', () => {
    const schemaSql = `CREATE TABLE Products (
      product_id INTEGER PRIMARY KEY,
      low_fats TEXT CHECK(low_fats IN ('Y', 'N')),
      recyclable TEXT CHECK(recyclable IN ('Y', 'N'))
    );`

    const seedSql = `INSERT INTO Products VALUES
      (0, 'Y', 'N'),
      (1, 'Y', 'Y'),
      (2, 'N', 'Y');`

    const parsed = parseSqlFromDdlDml(schemaSql, seedSql)
    assert.equal(parsed.tableName, 'Products')
    assert.deepEqual(parsed.columns, ['product_id', 'low_fats', 'recyclable'])
    assert.equal(parsed.rows.length, 3)
    assert.deepEqual(parsed.rows[0], ['0', 'Y', 'N'])
    assert.deepEqual(parsed.rows[1], ['1', 'Y', 'Y'])
    assert.deepEqual(parsed.rows[2], ['2', 'N', 'Y'])
  })
})
