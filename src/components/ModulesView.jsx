import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import Typography from '@mui/material/Typography'

import ModuleCard from './ModuleCard'

// Window 1 — list of all modules. Toggles: "по уровням / всё сразу" and
// "показывать ивентовые модули". A search box helps with 27 modules.
export default function ModulesView({
  modules,
  builtLevels,
  collected,
  setBuiltLevel,
  toggleCollected,
  showEvent,
  onShowEventChange,
}) {
  const [groupByLevel, setGroupByLevel] = useState(true)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return modules.filter((m) => {
      if (m.isEvent && !showEvent) return false
      if (q && !m.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [modules, showEvent, query])

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
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Поиск модуля…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 220 }}
        />
      </Box>

      {visible.length === 0 ? (
        <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Ничего не найдено.
        </Typography>
      ) : (
        visible.map((m) => (
          <ModuleCard
            key={m.id}
            module={m}
            builtLevel={builtLevels[m.id] || 0}
            groupByLevel={groupByLevel}
            collected={collected}
            onSetLevel={setBuiltLevel}
            onToggle={toggleCollected}
          />
        ))
      )}
    </Box>
  )
}
