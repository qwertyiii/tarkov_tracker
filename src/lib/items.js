// Pure helpers deriving collect-lists and the hideout-wide summary from the
// static data + user state (builtLevels, collected). Nothing here touches
// storage or React.

// Key of a collectible item = name + FIR class. FIR and non-FIR versions of the
// same item are DIFFERENT collectibles (different slots), see ТЗ 4.2.
export function itemKey(name, fir) {
  return name + (fir ? '__FIR' : '__STD')
}

// Levels strictly above the built level are still to-collect (ТЗ 4.3).
export function pendingLevels(module, builtLevel) {
  return module.levels.filter((l) => l.level > builtLevel)
}

// A level is ready to build when every MANDATORY item (optional !== true) is
// collected. Optional items never block (ТЗ 4.3 / 9.2).
export function isLevelReady(level, collected) {
  return level.items
    .filter((it) => !it.optional)
    .every((it) => !!collected[itemKey(it.name, it.fir)])
}

// Flat list of pending items for one module given its built level.
// Returns [{ key, name, qty, fir, optional, level }].
export function moduleItems(module, builtLevel) {
  const out = []
  for (const level of pendingLevels(module, builtLevel)) {
    for (const it of level.items) {
      out.push({
        ...it,
        key: itemKey(it.name, it.fir),
        level: level.level,
      })
    }
  }
  return out
}

// Hideout-wide summary grouped by itemKey across all modules (ТЗ 6.1).
// Returns [{ key, name, fir, optional, totalQty, usedIn: [{module, level}] }].
export function buildSummary(modules, builtLevels, includeEvent) {
  const groups = new Map()
  for (const module of modules) {
    if (module.isEvent && !includeEvent) continue
    const built = builtLevels[module.id] || 0
    for (const level of pendingLevels(module, built)) {
      for (const it of level.items) {
        const key = itemKey(it.name, it.fir)
        let g = groups.get(key)
        if (!g) {
          g = {
            key,
            name: it.name,
            fir: it.fir,
            optional: true, // becomes false if any non-optional occurrence
            totalQty: 0,
            usedIn: [],
          }
          groups.set(key, g)
        }
        g.totalQty += it.qty
        if (!it.optional) g.optional = false
        g.usedIn.push({ module: module.name, level: level.level })
      }
    }
  }
  return Array.from(groups.values())
}

// Sort helper: not-collected first, collected last; stable-ish alphabetical
// within each group. Used by both windows for the "archive to bottom" behavior.
export function sortByCollected(rows, collected, keyFn = (r) => r.key) {
  return [...rows].sort((a, b) => {
    const ca = collected[keyFn(a)] ? 1 : 0
    const cb = collected[keyFn(b)] ? 1 : 0
    if (ca !== cb) return ca - cb
    return a.name.localeCompare(b.name)
  })
}
