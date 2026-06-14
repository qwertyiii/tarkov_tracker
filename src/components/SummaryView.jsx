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

// Окно 2 — единый список всех предметов по убежищу, сгруппированный по itemKey
// (ТЗ 6). Со счётчиком found/need, поиском, «скрыть собранные» и «2 колонки».
export default function SummaryView({
  modules,
  builtLevels,
  collected,
  setCount,
  showEvent,
}) {
  const [query, setQuery] = useState('')
  const [hideCollected, setHideCollected] = useState(false)
  const [cols2, setCols2] = useState(false)

  const groups = useMemo(
    () => buildSummary(modules, builtLevels, showEvent),
    [modules, builtLevels, showEvent]
  )

  // «Собрано полностью» = found >= need (need = totalQty группы).
  const isDone = (g) => (collected[g.key] || 0) >= g.totalQty

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = groups
    if (q) rows = rows.filter((g) => g.name.toLowerCase().includes(q))
    if (hideCollected) rows = rows.filter((g) => !isDone(g))
    return sortByCollected(rows, isDone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, query, hideCollected, collected])

  const total = groups.length
  const done = groups.filter(isDone).length

  const renderRow = (g) => (
    <ItemRow
      key={g.key}
      name={g.name}
      fir={g.fir}
      optional={g.optional}
      lineQty={g.totalQty}
      need={g.totalQty}
      found={collected[g.key] || 0}
      onSetCount={(n) => setCount(g.key, n)}
      subtitle={'Нужен в: ' + g.usedIn.map((u) => `${u.module} ${u.level}`).join(', ')}
    />
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Собрано <b style={{ color: '#c7a26b' }}>{done}</b> из {total} позиций
        </Typography>
        <Box sx={{ flex: 1 }} />
        <FormControlLabel
          control={<Switch checked={cols2} onChange={(e) => setCols2(e.target.checked)} />}
          label="2 колонки"
        />
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

      {filtered.length === 0 ? (
        <Paper>
          <Typography color="text.secondary" sx={{ p: 2, fontStyle: 'italic' }}>
            {total === 0
              ? 'Всё убежище построено — собирать нечего.'
              : 'Ничего не найдено.'}
          </Typography>
        </Paper>
      ) : cols2 ? (
        // 2 колонки — каждая строка в своей карточке-ячейке
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            alignItems: 'start',
            gap: 1,
          }}
        >
          {filtered.map((g) => (
            <Paper key={g.key}>{renderRow(g)}</Paper>
          ))}
        </Box>
      ) : (
        // 1 колонка — единый список в одной карточке
        <Paper>{filtered.map(renderRow)}</Paper>
      )}
    </Box>
  )
}
