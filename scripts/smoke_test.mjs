// Smoke test of the app's own logic (src/lib/items.js) against data.json.
// items.js импортирует icons.json, поэтому грузим его через загрузчик Vite
// (как в реальном приложении), а не напрямую через Node ESM.
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
})
const { buildSummary, distributeCount, isLevelReady, itemKey, lineKey, moduleItems, pendingLevels } =
  await vite.ssrLoadModule('/src/lib/items.js')

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
const summary = buildSummary(data.modules, {}, {}, true)
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

// 4) readiness ignores optional items and respects per-line counts (lineKey).
let testedOptional = false
for (const m of data.modules)
  for (const l of m.levels) {
    if (l.items.some((it) => it.optional) && l.items.some((it) => !it.optional)) {
      const collected = {}
      // collect mandatory ones to exactly their qty (per-line count model)
      for (const it of l.items)
        if (!it.optional) collected[lineKey(m.id, l.level, it.name, it.fir)] = it.qty
      assert.equal(isLevelReady(m.id, l, collected), true, 'ready without optional collected')
      // one short on a mandatory item -> not ready
      const firstMand = l.items.find((it) => !it.optional)
      collected[lineKey(m.id, l.level, firstMand.name, firstMand.fir)] = firstMand.qty - 1
      assert.equal(isLevelReady(m.id, l, collected), false, 'not ready when count below qty')
      testedOptional = true
    }
  }
assert.ok(testedOptional, 'exercised an optional-bearing level')

// 4b) distributeCount: built lines locked at qty; remainder fills editable lines.
const distLines = [
  { lineKey: 'a', qty: 2, built: true },
  { lineKey: 'b', qty: 3, built: false },
  { lineKey: 'c', qty: 1, built: false },
]
// floor = 2 (built). target 5 -> editable 3 -> b=3, c=0
assert.deepEqual(distributeCount(distLines, 5), { a: 2, b: 3, c: 0 }, 'distribute spreads remainder')
// below floor clamps to floor (built stays at qty, editable 0)
assert.deepEqual(distributeCount(distLines, 0), { a: 2, b: 0, c: 0 }, 'cannot go below built floor')
// full target fills everything
assert.deepEqual(distributeCount(distLines, 6), { a: 2, b: 3, c: 1 }, 'full fill')

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

await vite.close()
