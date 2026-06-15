import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

import ModuleCard from './ModuleCard'
import { iconFor, needByKey, pendingLevels } from '../lib/items'

// Окно 1 — список всех модулей. Переключатели: «по уровням / всё сразу»,
// «ивентовые модули», «2 колонки». Поиск ищет и по названию модуля, и по
// предметам его непостроенных уровней.
export default function ModulesView({
  modules,
  builtLevels,
  collected,
  setBuiltLevel,
  setCount,
  showEvent,
  onShowEventChange,
}) {
  const [groupByLevel, setGroupByLevel] = useState(true)
  const [cols2, setCols2] = useState(false)
  // Режим показа уровней: 'current' | 'remaining' | 'all'
  const [levelMode, setLevelMode] = useState('remaining')
  const [query, setQuery] = useState('')
  // Раскрытые карточки (по id) при ручном управлении (без поиска).
  const [expandedSet, setExpandedSet] = useState(() => new Set())

  const q = query.trim().toLowerCase()

  // Нужное количество по всему убежищу для каждого предмета — считаем один раз.
  const needMap = useMemo(
    () => needByKey(modules, builtLevels, showEvent),
    [modules, builtLevels, showEvent]
  )

  // Для каждого модуля: видим ли он, совпал ли по имени, совпал ли по предмету.
  const visible = useMemo(() => {
    const list = []
    for (const m of modules) {
      if (m.isEvent && !showEvent) continue
      if (!q) {
        list.push({ module: m, nameMatch: false })
        continue
      }
      const nameMatch = m.name.toLowerCase().includes(q)
      const itemMatch = pendingLevels(m, builtLevels[m.id] || 0).some((l) =>
        l.items.some((it) => {
          const short = (iconFor(it.name).short || '').toLowerCase()
          return it.name.toLowerCase().includes(q) || short.includes(q)
        })
      )
      if (nameMatch || itemMatch) list.push({ module: m, nameMatch })
    }
    // Архив модулей: полностью построенные — вниз и тусклее.
    return list.sort((a, b) => {
      const da = (builtLevels[a.module.id] || 0) >= a.module.maxLevel ? 1 : 0
      const db = (builtLevels[b.module.id] || 0) >= b.module.maxLevel ? 1 : 0
      if (da !== db) return da - db
      return 0
    })
  }, [modules, showEvent, q, builtLevels])

  const toggleExpanded = (id, isExp) => {
    setExpandedSet((prev) => {
      const next = new Set(prev)
      if (isExp) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
          mb: 2,
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={groupByLevel}
              onChange={(e) => setGroupByLevel(e.target.checked)}
            />
          }
          label={groupByLevel ? 'По уровням' : 'Всё сразу'}
        />
        <FormControlLabel
          control={
            <Switch checked={showEvent} onChange={(e) => onShowEventChange(e.target.checked)} />
          }
          label="Ивентовые модули"
        />
        <FormControlLabel
          control={<Switch checked={cols2} onChange={(e) => setCols2(e.target.checked)} />}
          label="2 колонки"
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={levelMode}
          onChange={(_, v) => v && setLevelMode(v)}
          aria-label="Какие уровни показывать"
        >
          <ToggleButton value="current">Текущий</ToggleButton>
          <ToggleButton value="remaining">Оставшиеся</ToggleButton>
          <ToggleButton value="all">Все уровни</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Поиск модуля или предмета…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 260 }}
        />
      </Box>

      {visible.length === 0 ? (
        <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Ничего не найдено.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: cols2 ? { xs: '1fr', md: '1fr 1fr' } : '1fr',
            alignItems: 'start',
            gap: 2,
          }}
        >
          {visible.map(({ module: m, nameMatch }) => {
            const built = builtLevels[m.id] || 0
            const builtFully = built >= m.maxLevel
            return (
              <ModuleCard
                key={m.id}
                module={m}
                builtLevel={built}
                groupByLevel={groupByLevel}
                levelMode={levelMode}
                collected={collected}
                needMap={needMap}
                onSetLevel={setBuiltLevel}
                onSetCount={setCount}
                // При поиске совпавшие модули авто-раскрываем; иначе ручное состояние.
                expanded={q ? true : expandedSet.has(m.id)}
                onExpandedChange={toggleExpanded}
                // Если модуль попал в список только по предмету — показываем
                // внутри лишь подходящие предметы; при совпадении по имени — все.
                itemQuery={q && !nameMatch ? q : ''}
                dim={builtFully}
              />
            )
          })}
        </Box>
      )}
    </Box>
  )
}
