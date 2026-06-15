import { useMemo } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ConstructionIcon from '@mui/icons-material/Construction'

import ItemRow from './ItemRow'
import Conditions from './Conditions'
import {
  distributeCount,
  iconFor,
  isLevelReady,
  itemKey,
  levelsByMode,
  lineKey,
  pendingLevels,
  sortByCollected,
} from '../lib/items'

// Рисует готовые строки-дескрипторы: фильтрует по поиску, сортирует (готовые
// вниз) и отдаёт в ItemRow. Дескриптор уже несёт need/found/minCount/locked и
// колбэки — логику счёта формирует ModuleCard под конкретный режим.
function ItemList({ rows, itemQuery }) {
  const sorted = useMemo(() => {
    const q = (itemQuery || '').trim().toLowerCase()
    let rs = rows
    if (q)
      rs = rs.filter((r) => {
        const short = (iconFor(r.name).short || '').toLowerCase()
        return r.name.toLowerCase().includes(q) || short.includes(q)
      })
    return sortByCollected(rs, (r) => r.found >= r.need)
  }, [rows, itemQuery])

  if (sorted.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1, pl: 1, fontStyle: 'italic' }}>
        {itemQuery ? 'Нет подходящих предметов.' : 'Предметов нет — только условия.'}
      </Typography>
    )
  }
  return (
    <Box>
      {sorted.map((r) => {
        const meta = iconFor(r.name)
        return (
          <ItemRow
            key={r.rowKey}
            name={r.name}
            fir={r.fir}
            optional={r.optional}
            icon={meta.icon}
            short={meta.short}
            lineQty={r.lineQty}
            need={r.need}
            found={r.found}
            minCount={r.minCount}
            locked={r.locked}
            onSetCount={r.onSetCount}
            onBlocked={r.onBlocked}
          />
        )
      })}
    </Box>
  )
}

// Строки для одного уровня (режим «по уровням»): счётчик = потребность строки,
// построенные уровни заблокированы (read-only, полные).
function rowsForLevel(module, level, builtLevel, collected, setCount) {
  return level.items.map((it) => {
    const lk = lineKey(module.id, level.level, it.name, it.fir)
    return {
      rowKey: lk,
      name: it.name,
      fir: it.fir,
      optional: it.optional,
      lineQty: it.qty,
      need: it.qty,
      found: collected[lk] || 0,
      minCount: 0,
      locked: level.level <= builtLevel,
      onSetCount: (n) => setCount(lk, n),
    }
  })
}

// Строки для «всё сразу»: агрегируем предметы показываемых уровней по itemKey в
// один ряд. Знаменатель = сумма по показанным уровням, нижний порог = сумма
// построенных строк, запись распределяется по строкам через distributeCount.
function rowsMerged(module, levels, builtLevel, collected, setCounts, onNotify) {
  const map = new Map()
  for (const level of levels) {
    for (const it of level.items) {
      const key = itemKey(it.name, it.fir)
      const lk = lineKey(module.id, level.level, it.name, it.fir)
      const built = level.level <= builtLevel
      let g = map.get(key)
      if (!g) {
        g = {
          rowKey: key,
          name: it.name,
          fir: it.fir,
          optional: true,
          need: 0,
          found: 0,
          minCount: 0,
          lines: [],
        }
        map.set(key, g)
      }
      g.need += it.qty
      g.found += collected[lk] || 0
      if (built) g.minCount += it.qty
      if (!it.optional) g.optional = false
      g.lines.push({ lineKey: lk, qty: it.qty, built })
    }
  }
  return Array.from(map.values()).map((g) => ({
    ...g,
    lineQty: g.need,
    locked: false,
    onSetCount: (n) => setCounts(distributeCount(g.lines, n)),
    onBlocked: () => onNotify(`«${g.name}»: часть занята построенными уровнями`),
  }))
}

export default function ModuleCard({
  module,
  builtLevel,
  groupByLevel,
  levelMode,
  collected,
  onSetLevel,
  setCount,
  setCounts,
  onNotify,
  expanded,
  onExpandedChange,
  itemQuery,
  dim,
}) {
  // pending — реально оставшаяся работа (для шапки и кнопки постройки).
  const pending = pendingLevels(module, builtLevel)
  // shownLevels — что показываем в списке согласно выбранному режиму.
  const shownLevels = levelsByMode(module, builtLevel, levelMode)
  const atMax = builtLevel >= module.maxLevel

  // Целевой уровень = следующий к постройке. Его готовность включает кнопку.
  const targetLevel = module.levels.find((l) => l.level === builtLevel + 1)
  const ready = targetLevel ? isLevelReady(module.id, targetLevel, collected) : false

  // Сколько обязательных строк ещё не добрано (found < qty) — для шапки.
  const remaining = useMemo(() => {
    let n = 0
    for (const l of pending)
      for (const it of l.items)
        if (
          !it.optional &&
          (collected[lineKey(module.id, l.level, it.name, it.fir)] || 0) < it.qty
        )
          n++
    return n
  }, [pending, collected, module.id])

  // «Всё сразу» — один ряд на предмет из показываемых уровней.
  const mergedRows = useMemo(
    () => rowsMerged(module, shownLevels, builtLevel, collected, setCounts, onNotify),
    [module, shownLevels, builtLevel, collected, setCounts, onNotify]
  )
  const mergedConditions = useMemo(
    () => shownLevels.flatMap((l) => l.conditions),
    [shownLevels]
  )

  return (
    <Accordion
      expanded={!!expanded}
      onChange={(_, isExp) => onExpandedChange(module.id, isExp)}
      sx={{ opacity: dim ? 0.55 : 1 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flex: 1, pr: 1 }}>
          <Typography sx={{ fontWeight: 600, flexShrink: 0 }}>{module.name}</Typography>
          {module.isEvent && (
            <Chip label="ивент" size="small" color="primary" variant="outlined" sx={{ height: 20 }} />
          )}
          <Box sx={{ flex: 1 }} />
          <Chip
            label={`${builtLevel} / ${module.maxLevel}`}
            size="small"
            variant="outlined"
            sx={{ height: 22, fontFamily: '"JetBrains Mono", monospace' }}
          />
          {atMax ? (
            <Chip label="построен" size="small" color="success" sx={{ height: 22 }} />
          ) : (
            <Chip
              label={remaining === 0 ? 'готов' : `осталось ${remaining}`}
              size="small"
              color={remaining === 0 ? 'success' : 'default'}
              sx={{ height: 22 }}
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {/* Выбор построенного уровня (ТЗ 5.1) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Построенный уровень</InputLabel>
            <Select
              label="Построенный уровень"
              value={builtLevel}
              onChange={(e) => onSetLevel(module.id, Number(e.target.value), module)}
            >
              {Array.from({ length: module.maxLevel + 1 }, (_, i) => i).map((lvl) => (
                <MenuItem key={lvl} value={lvl}>
                  {lvl === 0 ? 'Не построен' : `Уровень ${lvl}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Кнопка постройки следующего уровня (ТЗ 5.4) */}
          {!atMax && (
            <Button
              variant="contained"
              startIcon={<ConstructionIcon />}
              disabled={!ready}
              onClick={() => onSetLevel(module.id, builtLevel + 1, module)}
            >
              Построить уровень {builtLevel + 1}
            </Button>
          )}
          {atMax && (
            <Typography variant="body2" color="success.main">
              Модуль на максимальном уровне.
            </Typography>
          )}
        </Box>

        {shownLevels.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {atMax ? 'Всё построено — собирать нечего.' : 'Показывать нечего.'}
          </Typography>
        ) : groupByLevel ? (
          // «По уровням» — счётчик по строке уровня
          shownLevels.map((level) => (
            <Box key={level.level} sx={{ mb: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'primary.main',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  pb: 0.5,
                  mb: 0.5,
                }}
              >
                Уровень {level.level}
                {level.level <= builtLevel && (
                  <Box component="span" sx={{ color: 'text.secondary', ml: 1, fontSize: 12 }}>
                    (построен)
                  </Box>
                )}
              </Typography>
              <ItemList
                rows={rowsForLevel(module, level, builtLevel, collected, setCount)}
                itemQuery={itemQuery}
              />
              {!itemQuery && <Conditions conditions={level.conditions} />}
            </Box>
          ))
        ) : (
          // «Всё сразу» — один ряд на предмет, знаменатель = сумма по модулю
          <Box>
            <ItemList rows={mergedRows} itemQuery={itemQuery} />
            {!itemQuery && <Conditions conditions={mergedConditions} />}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}
