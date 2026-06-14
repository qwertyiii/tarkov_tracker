import { useCallback, useEffect, useMemo, useState } from 'react'

// Версионированный ключ localStorage. v2: collected теперь не { key: true },
// а счётчик { key: число }. Старый булев прогресс несовместим — новый ключ
// версии просто даёт чистый старт, отдельной миграции не делаем (ТЗ 7).
const STORAGE_KEY = 'tarkov-hideout-v2'

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

  const setBuiltLevel = useCallback((moduleId, level) => {
    setState((s) => ({
      ...s,
      builtLevels: { ...s.builtLevels, [moduleId]: level },
    }))
  }, [])

  // Устанавливает счётчик найденного для предмета. n нормализуется к целому
  // >= 0; ноль удаляет ключ из карты, чтобы экспорт оставался компактным.
  const setCount = useCallback((key, n) => {
    setState((s) => {
      const value = Math.max(0, Math.round(Number(n) || 0))
      const next = { ...s.collected }
      if (value > 0) next[key] = value
      else delete next[key]
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
    reset,
    importState,
    exportString,
  }
}
