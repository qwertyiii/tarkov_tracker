import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

import ItemRow from './ItemRow'
import { buildSummary, sortByCollected } from '../lib/items'

// Window 2 — single hideout-wide list grouped by itemKey (ТЗ 6).
export default function SummaryView({
  modules,
  builtLevels,
  collected,
  toggleCollected,
  showEvent,
}) {
  const [query, setQuery] = useState('')
  const [hideCollected, setHideCollected] = useState(false)

  const groups = useMemo(
    () => buildSummary(modules, builtLevels, showEvent),
    [modules, builtLevels, showEvent]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = groups
    if (q) rows = rows.filter((g) => g.name.toLowerCase().includes(q))
    if (hideCollected) rows = rows.filter((g) => !collected[g.key])
    return sortByCollected(rows, collected)
  }, [groups, query, hideCollected, collected])

  const total = groups.length
  const done = groups.filter((g) => collected[g.key]).length

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Собрано <b style={{ color: '#c7a26b' }}>{done}</b> из {total} позиций
        </Typography>
        <Box sx={{ flex: 1 }} />
        <FormControlLabel
          control={
            <Switch checked={hideCollected} onChange={(e) => setHideCollected(e.target.checked)} />
          }
          label="Скрыть собранные"
        />
        <TextField
          size="small"
          placeholder="Поиск предмета…"
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

      <Paper>
        {filtered.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2, fontStyle: 'italic' }}>
            {total === 0
              ? 'Всё убежище построено — собирать нечего.'
              : 'Ничего не найдено.'}
          </Typography>
        ) : (
          filtered.map((g) => (
            <ItemRow
              key={g.key}
              name={g.name}
              qty={g.totalQty}
              fir={g.fir}
              optional={g.optional}
              collected={!!collected[g.key]}
              onToggle={(v) => toggleCollected(g.key, v)}
              subtitle={
                'Нужен в: ' +
                g.usedIn.map((u) => `${u.module} ${u.level}`).join(', ')
              }
            />
          ))
        )}
      </Paper>
    </Box>
  )
}
