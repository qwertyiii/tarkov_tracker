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

// Ключ конкретного требования: модуль + уровень + предмет(+FIR). Теперь счётчик
// найденного хранится по строке требования, а не общий на предмет.
export function lineKey(moduleId, level, name, fir) {
  return moduleId + '@' + level + '#' + itemKey(name, fir)
}

// Levels strictly above the built level are still to-collect (ТЗ 4.3).
export function pendingLevels(module, builtLevel) {
  return module.levels.filter((l) => l.level > builtLevel)
}

// Какие уровни показывать в окне «Модули» в зависимости от режима:
//   'current'   — только следующий к постройке (builtLevel + 1)
//   'all'       — все уровни модуля
//   'remaining' — все непостроенные (по умолчанию)
export function levelsByMode(module, builtLevel, mode) {
  if (mode === 'current') return module.levels.filter((l) => l.level === builtLevel + 1)
  if (mode === 'all') return module.levels
  return pendingLevels(module, builtLevel)
}

// Уровень готов к постройке, когда по КАЖДОМУ обязательному предмету
// (optional !== true) найдено не меньше, чем нужно: count >= qty. Счёт идёт по
// строке требования (нужен moduleId). Опциональные не блокируют (ТЗ 4.3 / 9.2).
export function isLevelReady(moduleId, level, collected) {
  return level.items
    .filter((it) => !it.optional)
    .every((it) => (collected[lineKey(moduleId, level.level, it.name, it.fir)] || 0) >= it.qty)
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

// Свод по всему убежищу, сгруппированный по itemKey, по ВСЕМ уровням (включая
// построенные). Для каждого предмета считает:
//   totalQty — сколько нужно всего по всем модулям/уровням
//   builtQty — сколько занято уже построенными уровнями (нижний порог)
//   found    — сумма найденного по строкам (collected[lineKey])
//   lines    — строки требований [{ lineKey, qty, built }]
//   usedIn   — где используется [{ module, level }]
export function buildSummary(modules, builtLevels, collected, includeEvent) {
  const groups = new Map()
  for (const module of modules) {
    if (module.isEvent && !includeEvent) continue
    const built = builtLevels[module.id] || 0
    for (const level of module.levels) {
      for (const it of level.items) {
        const key = itemKey(it.name, it.fir)
        const lk = lineKey(module.id, level.level, it.name, it.fir)
        const isBuilt = level.level <= built
        let g = groups.get(key)
        if (!g) {
          g = {
            key,
            name: it.name,
            fir: it.fir,
            optional: true, // becomes false if any non-optional occurrence
            totalQty: 0,
            found: 0,
            builtQty: 0,
            lines: [],
            usedIn: [],
          }
          groups.set(key, g)
        }
        g.totalQty += it.qty
        if (isBuilt) g.builtQty += it.qty
        g.found += collected[lk] || 0
        g.lines.push({ lineKey: lk, qty: it.qty, built: isBuilt })
        if (!it.optional) g.optional = false
        g.usedIn.push({ module: module.name, level: level.level })
      }
    }
  }
  return Array.from(groups.values())
}

// Распределяет сумму targetN по строкам предмета. Построенные строки
// заблокированы на своём qty (нижний порог floor), остаток раздаётся
// редактируемым строкам по порядку. Возвращает { lineKey: count }.
export function distributeCount(lines, targetN) {
  const floor = lines.filter((l) => l.built).reduce((s, l) => s + l.qty, 0)
  let editable = Math.max(0, targetN - floor)
  const updates = {}
  for (const l of lines) {
    if (l.built) {
      updates[l.lineKey] = l.qty
      continue
    }
    const give = Math.min(l.qty, editable)
    updates[l.lineKey] = give
    editable -= give
  }
  return updates
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
