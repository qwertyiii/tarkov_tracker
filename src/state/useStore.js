import { useCallback, useEffect, useMemo, useState } from 'react'

// Versioned localStorage key. Bumping the version must not break old progress:
// unknown keys are simply ignored, missing keys default sensibly (ТЗ 7).
const STORAGE_KEY = 'tarkov-hideout-v1'

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

  const toggleCollected = useCallback((key, value) => {
    setState((s) => {
      const next = { ...s.collected }
      const wanted = value === undefined ? !next[key] : value
      if (wanted) next[key] = true
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
    toggleCollected,
    reset,
    importState,
    exportString,
  }
}
