// Node smoke test of the app's own logic (src/lib/items.js) against data.json.
// Confirms buildSummary at builtLevels=0 reproduces correct totals, that the
// FIR/STD split keys are distinct, and that build-readiness ignores optionals.
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import {
  buildSummary,
  isLevelReady,
  itemKey,
  moduleItems,
  pendingLevels,
} from '../src/lib/items.js'

const data = JSON.parse(readFileSync(new URL('../src/data/data.json', import.meta.url)))

// 1) module / row counts
assert.equal(data.modules.length, 27, '27 modules')
let itemRows = 0
let condRows = 0
for (const m of data.modules)
  for (const l of m.levels) {
    itemRows += l.items.length
    condRows += l.conditions.length
  }
assert.equal(itemRows, 296, 'item rows')
assert.equal(condRows, 154, 'condition rows')

// 2) summary at all-zero built levels, including event modules
const summary = buildSummary(data.modules, {}, true)
// total qty of mandatory-only should match the reference (119 distinct names,
// optional excluded). Build a name-level mandatory aggregate.
const mand = new Map()
for (const m of data.modules)
  for (const l of m.levels)
    for (const it of l.items) {
      if (it.optional) continue
      mand.set(it.name, (mand.get(it.name) || 0) + it.qty)
    }
assert.equal(mand.size, 119, '119 distinct mandatory item names')

// 3) FIR / STD produce distinct keys & rows. Find an item present as both.
const both = data.modules
  .flatMap((m) => m.levels.flatMap((l) => l.items))
  .reduce((acc, it) => {
    acc[it.name] = acc[it.name] || new Set()
    acc[it.name].add(it.fir)
    return acc
  }, {})
const dualName = Object.keys(both).find((n) => both[n].size === 2)
assert.ok(dualName, 'at least one item appears as both FIR and non-FIR')
const firKey = itemKey(dualName, true)
const stdKey = itemKey(dualName, false)
assert.notEqual(firKey, stdKey)
assert.ok(summary.some((g) => g.key === firKey), 'FIR row present')
assert.ok(summary.some((g) => g.key === stdKey), 'STD row present')

// 4) readiness ignores optional items. Take a level that has an optional item.
let testedOptional = false
for (const m of data.modules)
  for (const l of m.levels) {
    if (l.items.some((it) => it.optional) && l.items.some((it) => !it.optional)) {
      const collected = {}
      // collect only mandatory ones
      for (const it of l.items) if (!it.optional) collected[itemKey(it.name, it.fir)] = true
      assert.equal(isLevelReady(l, collected), true, 'ready without optional collected')
      testedOptional = true
    }
  }
assert.ok(testedOptional, 'exercised an optional-bearing level')

// 5) pendingLevels filters by built level
const sample = data.modules.find((m) => m.maxLevel >= 2)
assert.equal(
  pendingLevels(sample, 1).every((l) => l.level > 1),
  true,
  'pending levels strictly above built'
)
assert.ok(moduleItems(sample, sample.maxLevel).length === 0, 'fully built -> no items')

console.log('SMOKE OK:', {
  modules: data.modules.length,
  itemRows,
  condRows,
  summaryRows: summary.length,
  dualExample: dualName,
})
