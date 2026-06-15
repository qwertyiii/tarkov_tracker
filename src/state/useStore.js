import { useCallback, useEffect, useMemo, useState } from 'react'
import { lineKey } from '../lib/items'

// Версионированный ключ localStorage. v3: счётчик найденного теперь по СТРОКЕ
// требования (collected = { lineKey: число }), а не общий на предмет. Модель
// несовместима с v2 — прогресс разово обнулится (новый ключ = чистый старт).
const STORAGE_KEY = 'tarkov-hideout-v3'

const EMPTY_STATE = { builtLevels: {}, collected: {} }

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_STATE }
    const parsed = JSON.parse(raw)
    return {
      builtLevels:
        parsed && typeof parsed.builtLevels === 'object' && parsed.builtLevels
          ? parsed.builtLevels
          : {},
      collected:
        parsed && typeof parsed.collected === 'object' && parsed.collected
          ? parsed.collected
          : {},
    }
  } catch {
    // Corrupt JSON or storage unavailable -> start clean, never crash.
    return { ...EMPTY_STATE }
  }
}

// Single source of truth for user state. The whole object is persisted on every
// change. Cross-window sync (ТЗ 4.2) is automatic because both views read the
// same `collected` map by itemKey.
export function useStore() {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage full / unavailable — ignore */
    }
  }, [state])

  // Меняет построенный уровень модуля и авто-заполняет/обнуляет строки:
  //   построенные уровни (1..newLevel) проставляются найденными полностью;
  //   откатанные уровни обнуляются. Ручной прогресс на нестроившихся уровнях
  //   не трогается. module нужен, чтобы знать предметы уровней.
  const setBuiltLevel = useCallback((moduleId, newLevel, module) => {
    setState((s) => {
      const old = s.builtLevels[moduleId] || 0
      const collected = { ...s.collected }
      for (const lvl of module?.levels || []) {
        const newlyBuilt = lvl.level <= newLevel && lvl.level > old
        const rolledBack = lvl.level > newLevel && lvl.level <= old
        if (!newlyBuilt && !rolledBack) continue
        for (const it of lvl.items) {
          const lk = lineKey(moduleId, lvl.level, it.name, it.fir)
          if (newlyBuilt) collected[lk] = it.qty // построили — полностью
          else delete collected[lk] // откатили — обнулили
        }
      }
      return { ...s, builtLevels: { ...s.builtLevels, [moduleId]: newLevel }, collected }
    })
  }, [])

  // Устанавливает счётчик найденного по одному ключу-строке. n нормализуется к
  // целому >= 0; ноль удаляет ключ из карты, чтобы экспорт оставался компактным.
  const setCount = useCallback((key, n) => {
    setState((s) => {
      const value = Math.max(0, Math.round(Number(n) || 0))
      const next = { ...s.collected }
      if (value > 0) next[key] = value
      else delete next[key]
      return { ...s, collected: next }
    })
  }, [])

  // Применяет сразу карту { lineKey: число } (например, распределение суммы по
  // строкам предмета). Ноль удаляет ключ.
  const setCounts = useCallback((updates) => {
    setState((s) => {
      const next = { ...s.collected }
      for (const [key, n] of Object.entries(updates)) {
        const value = Math.max(0, Math.round(Number(n) || 0))
        if (value > 0) next[key] = value
        else delete next[key]
      }
      return { ...s, collected: next }
    })
  }, [])

  const reset = useCallback(() => {
    setState({ builtLevels: {}, collected: {} })
  }, [])

  const importState = useCallback((obj) => {
    setState({
      builtLevels:
        obj && typeof obj.builtLevels === 'object' && obj.builtLevels
          ? obj.builtLevels
          : {},
      collected:
        obj && typeof obj.collected === 'object' && obj.collected
          ? obj.collected
          : {},
    })
  }, [])

  const exportString = useMemo(
    () => JSON.stringify(state, null, 2),
    [state]
  )

  return {
    builtLevels: state.builtLevels,
    collected: state.collected,
    setBuiltLevel,
    setCount,
    setCounts,
    reset,
    importState,
    exportString,
  }
}
