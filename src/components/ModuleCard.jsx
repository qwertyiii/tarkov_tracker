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
import { iconFor, isLevelReady, itemKey, pendingLevels, sortByCollected } from '../lib/items'

// Список предметов одного уровня (или объединённый). Сортировка: «не готово для
// этого уровня» вверх, «готово» (found >= qty этой строки) вниз. need берётся
// общий по убежищу из needMap, found — общий счётчик collected[key].
function LevelItems({ items, collected, needMap, onSetCount, itemQuery }) {
  const sorted = useMemo(() => {
    const q = (itemQuery || '').trim().toLowerCase()
    let rows = items.map((it) => ({ ...it, key: itemKey(it.name, it.fir) }))
    if (q)
      rows = rows.filter((r) => {
        const short = (iconFor(r.name).short || '').toLowerCase()
        return r.name.toLowerCase().includes(q) || short.includes(q)
      })
    // «готово для уровня» = найдено не меньше, чем нужно в этой строке
    return sortByCollected(rows, (r) => (collected[r.key] || 0) >= r.qty)
  }, [items, collected, itemQuery])

  if (sorted.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1, pl: 1, fontStyle: 'italic' }}>
        {itemQuery ? 'Нет подходящих предметов.' : 'Предметов нет — только условия.'}
      </Typography>
    )
  }
  return (
    <Box>
      {sorted.map((it) => {
        const meta = iconFor(it.name)
        return (
          <ItemRow
            key={it.key + '@' + it.level}
            name={it.name}
            fir={it.fir}
            optional={it.optional}
            icon={meta.icon}
            short={meta.short}
            lineQty={it.qty}
            need={needMap.get(it.key) ?? it.qty}
            found={collected[it.key] || 0}
            onSetCount={(n) => onSetCount(it.key, n)}
          />
        )
      })}
    </Box>
  )
}

export default function ModuleCard({
  module,
  builtLevel,
  groupByLevel,
  collected,
  needMap,
  onSetLevel,
  onSetCount,
  expanded,
  onExpandedChange,
  itemQuery,
  dim,
}) {
  const pending = pendingLevels(module, builtLevel)
  const atMax = builtLevel >= module.maxLevel

  // Целевой уровень = следующий к постройке. Его готовность включает кнопку.
  const targetLevel = module.levels.find((l) => l.level === builtLevel + 1)
  const ready = targetLevel ? isLevelReady(targetLevel, collected) : false

  // Сколько обязательных предметов ещё не добрано (found < qty) — для шапки.
  const remaining = useMemo(() => {
    let n = 0
    for (const l of pending)
      for (const it of l.items)
        if (!it.optional && (collected[itemKey(it.name, it.fir)] || 0) < it.qty) n++
    return n
  }, [pending, collected])

  // «Всё сразу» — объединяем предметы и условия всех непостроенных уровней.
  const mergedItems = useMemo(() => pending.flatMap((l) => l.items), [pending])
  const mergedConditions = useMemo(() => pending.flatMap((l) => l.conditions), [pending])

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
              onChange={(e) => onSetLevel(module.id, Number(e.target.value))}
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
              onClick={() => onSetLevel(module.id, builtLevel + 1)}
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

        {pending.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Всё построено — собирать нечего.
          </Typography>
        ) : groupByLevel ? (
          // «По уровням»
          pending.map((level) => (
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
              </Typography>
              <LevelItems
                items={level.items}
                collected={collected}
                needMap={needMap}
                onSetCount={onSetCount}
                itemQuery={itemQuery}
              />
              {!itemQuery && <Conditions conditions={level.conditions} />}
            </Box>
          ))
        ) : (
          // «Всё сразу»
          <Box>
            <LevelItems
              items={mergedItems}
              collected={collected}
              needMap={needMap}
              onSetCount={onSetCount}
              itemQuery={itemQuery}
            />
            {!itemQuery && <Conditions conditions={mergedConditions} />}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}
