// Pure helpers deriving collect-lists and the hideout-wide summary from the
// static data + user state (builtLevels, collected). Nothing here touches
// storage or React.
import icons from '../data/icons.json'

// Иконка и короткое имя предмета по точному названию из icons.json.
// Если предмета нет — возвращает пустой объект (без ошибок).
export function iconFor(name) {
  return icons[name] || {}
}

// Key of a collectible item = name + FIR class. FIR and non-FIR versions of the
// same item are DIFFERENT collectibles (different slots), see ТЗ 4.2.
export function itemKey(name, fir) {
  return name + (fir ? '__FIR' : '__STD')
}

// Levels strictly above the built level are still to-collect (ТЗ 4.3).
export function pendingLevels(module, builtLevel) {
  return module.levels.filter((l) => l.level > builtLevel)
}

// Уровень готов к постройке, когда по КАЖДОМУ обязательному предмету
// (optional !== true) найдено не меньше, чем нужно: count >= qty.
// Опциональные предметы постройку не блокируют (ТЗ 4.3 / 9.2).
export function isLevelReady(level, collected) {
  return level.items
    .filter((it) => !it.optional)
    .every((it) => (collected[itemKey(it.name, it.fir)] || 0) >= it.qty)
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

// Сколько каждого предмета нужно по ВСЕМУ убежищу с учётом построенных уровней.
// Это и максимум счётчика, и порог «собрано полностью». Возвращает Map
// itemKey -> totalQty, посчитанный через buildSummary.
export function needByKey(modules, builtLevels, includeEvent) {
  const map = new Map()
  for (const g of buildSummary(modules, builtLevels, includeEvent)) {
    map.set(g.key, g.totalQty)
  }
  return map
}

// Сортировка-архивация: «не готово» вверх, «готово» вниз, внутри групп по
// алфавиту. Признак готовности задаётся предикатом isDone(row), чтобы можно
// было считать готовность и по счётчику (found >= qty), и по любому условию.
export function sortByCollected(rows, isDone) {
  return [...rows].sort((a, b) => {
    const da = isDone(a) ? 1 : 0
    const db = isDone(b) ? 1 : 0
    if (da !== db) return da - db
    return a.name.localeCompare(b.name)
  })
}
