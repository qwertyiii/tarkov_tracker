import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'

import ItemRow from './ItemRow'
import { buildSummary, distributeCount, iconFor, sortByCollected } from '../lib/items'

// Панель справа: все модули со степперами −/+ уровня. Построил уровень →
// его предметы сами уходят из списка слева (buildSummary считается от builtLevels).
function ModulesPanel({ modules, builtLevels, showEvent, setBuiltLevel }) {
  const rows = useMemo(() => {
    const list = modules.filter((m) => !m.isEvent || showEvent)
    // Полностью построенные — вниз.
    return [...list].sort((a, b) => {
      const da = (builtLevels[a.id] || 0) >= a.maxLevel ? 1 : 0
      const db = (builtLevels[b.id] || 0) >= b.maxLevel ? 1 : 0
      return da - db
    })
  }, [modules, builtLevels, showEvent])

  return (
    <Paper sx={{ p: 1.5 }}>
      <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', mb: 0.5 }}>
        Модули
      </Typography>
      {rows.map((m) => {
        const built = builtLevels[m.id] || 0
        const atMax = built >= m.maxLevel
        return (
          <Box
            key={m.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              py: 0.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              opacity: atMax ? 0.5 : 1,
            }}
          >
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap title={m.name}>
              {m.name}
            </Typography>
            <Chip
              label={`${built} / ${m.maxLevel}`}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontFamily: '"JetBrains Mono", monospace' }}
            />
            <IconButton
              size="small"
              aria-label={`Понизить уровень ${m.name}`}
              disabled={built <= 0}
              onClick={() => setBuiltLevel(m.id, Math.max(0, built - 1), m)}
            >
              <RemoveIcon fontSize="inherit" />
            </IconButton>
            <IconButton
              size="small"
              aria-label={`Повысить уровень ${m.name}`}
              disabled={atMax}
              onClick={() => setBuiltLevel(m.id, Math.min(m.maxLevel, built + 1), m)}
            >
              <AddIcon fontSize="inherit" />
            </IconButton>
          </Box>
        )
      })}
    </Paper>
  )
}

// Окно 2 — единый список всех предметов по убежищу, сгруппированный по itemKey
// (ТЗ 6). Слева список со счётчиком found/need, поиском, «скрыть собранные» и
// «2 колонки»; справа панель модулей со степперами уровня.
export default function SummaryView({
  modules,
  builtLevels,
  collected,
  setCounts,
  setBuiltLevel,
  onNotify,
  showEvent,
}) {
  const [query, setQuery] = useState('')
  const [hideCollected, setHideCollected] = useState(false)
  const [cols2, setCols2] = useState(false)

  // Свод теперь по всем уровням и зависит от collected (found/builtQty/lines).
  const groups = useMemo(
    () => buildSummary(modules, builtLevels, collected, showEvent),
    [modules, builtLevels, collected, showEvent]
  )

  // «Собрано полностью» = найдено по всем модулям не меньше, чем нужно всего.
  const isDone = (g) => g.found >= g.totalQty

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = groups
    if (q)
      rows = rows.filter((g) => {
        const short = (iconFor(g.name).short || '').toLowerCase()
        return g.name.toLowerCase().includes(q) || short.includes(q)
      })
    if (hideCollected) rows = rows.filter((g) => !isDone(g))
    return sortByCollected(rows, isDone)
  }, [groups, query, hideCollected])

  const total = groups.length
  const done = groups.filter(isDone).length

  const renderRow = (g) => {
    const meta = iconFor(g.name)
    return (
      <ItemRow
        key={g.key}
        name={g.name}
        fir={g.fir}
        optional={g.optional}
        icon={meta.icon}
        short={meta.short}
        lineQty={g.totalQty}
        need={g.totalQty}
        found={g.found}
        minCount={g.builtQty}
        onSetCount={(n) => setCounts(distributeCount(g.lines, n))}
        onBlocked={() =>
          onNotify(
            `«${g.name}»: ${g.builtQty} шт. заняты построенными модулями — сначала понизьте их уровень`
          )
        }
        subtitle={'Нужен в: ' + g.usedIn.map((u) => `${u.module} ${u.level}`).join(', ')}
      />
    )
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
      {/* Левая часть — список предметов со всеми переключателями */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
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

      {/* Правая часть — панель модулей со степперами уровня */}
      <Box
        sx={{
          width: { xs: '100%', md: 300 },
          flexShrink: 0,
          alignSelf: 'flex-start',
          position: { md: 'sticky' },
          top: { md: 16 },
        }}
      >
        <ModulesPanel
          modules={modules}
          builtLevels={builtLevels}
          showEvent={showEvent}
          setBuiltLevel={setBuiltLevel}
        />
      </Box>
    </Box>
  )
}
