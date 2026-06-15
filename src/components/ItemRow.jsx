import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { FirBadge, OptionalBadge, QtyBadge } from './Badges'

// Одна строка собираемого предмета со счётчиком найденного. Используется в обоих
// окнах. Пропсы:
//   name, fir, optional — описание предмета
//   icon — URL картинки (или пусто), short — короткое имя (или пусто)
//   lineQty — сколько нужно в этом контексте (для бейджа ×N)
//   need    — максимум счётчика и порог «собрано полностью»
//   found   — сколько уже найдено
//   minCount — нижняя граница счётчика (занято построенными модулями/уровнями)
//   locked  — строка read-only (потрачена на постройку уровня)
//   onSetCount(n) — записать новое значение счётчика
//   onBlocked() — попытка увести ниже minCount (для предупреждения)
//   subtitle — подсказка («где используется» / уровень)
export default function ItemRow({
  name,
  fir,
  optional,
  icon,
  short,
  lineQty,
  need,
  found,
  minCount = 0,
  locked = false,
  onSetCount,
  onBlocked,
  subtitle,
}) {
  // need мог уменьшиться после постройки уровня — не показываем больше нужного
  const shown = Math.min(found, need)
  const done = found >= need

  // Локальный текст поля ввода, чтобы можно было стирать/печатать; на blur и
  // через −/+ клампим в minCount..need.
  const [text, setText] = useState(String(shown))
  useEffect(() => {
    setText(String(shown))
  }, [shown])

  // Клампим в [minCount, need]. Запрос ниже minCount → предупредить и не опускать.
  const clamp = (n) => {
    const r = Math.round(Number(n) || 0)
    if (r < minCount) {
      onBlocked?.()
      return minCount
    }
    return Math.min(need, r)
  }

  const commit = (raw) => {
    if (locked) return
    const n = clamp(raw)
    onSetCount(n)
    setText(String(n))
  }

  // Поставить «собрано» = need, снять = minCount (нельзя ниже занятого).
  const toggleDone = () => {
    if (locked) return
    onSetCount(done ? minCount : need)
  }

  // Состояние загрузки картинки: 'loading' | 'ok' | 'error'. Пока не 'ok' —
  // показываем заглушку (short/?), чтобы не мелькало чёрным. Сбрасываем при
  // смене src (строки переиспользуются при сортировке/фильтре).
  const [imgState, setImgState] = useState('loading')
  useEffect(() => {
    setImgState('loading')
  }, [icon])

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.75,
        px: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        opacity: done || locked ? 0.45 : 1,
        transition: 'opacity 120ms',
        '&:hover': { backgroundColor: 'rgba(199,162,107,0.06)' },
      }}
    >
      {/* Картинка предмета (или заглушка). Клик = отметить/снять «собрано». */}
      <Box
        onClick={locked ? undefined : toggleDone}
        title={locked ? 'Потрачено на постройку' : 'Отметить собранным'}
        sx={{
          position: 'relative',
          width: 40,
          height: 40,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#15140f',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0.5,
          overflow: 'hidden',
          cursor: locked ? 'default' : 'pointer',
        }}
      >
        {/* Заглушка видна, пока картинка не загрузилась (или её нет/ошибка);
            картинка ниже накладывается поверх неё абсолютно при загрузке */}
        {(!icon || imgState !== 'ok') && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 11, px: 0.25, textAlign: 'center', lineHeight: 1 }}
          >
            {short || '?'}
          </Typography>
        )}
        {icon && imgState !== 'error' && (
          <Box
            component="img"
            src={icon}
            alt={name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgState('ok')}
            onError={() => setImgState('error')}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: imgState === 'ok' ? 1 : 0,
              transition: 'opacity 200ms',
            }}
          />
        )}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Typography
            sx={{
              fontWeight: 500,
              textDecoration: done || locked ? 'line-through' : 'none',
            }}
          >
            {name}
          </Typography>
          {fir && <FirBadge />}
          {optional && <OptionalBadge />}
        </Box>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      <QtyBadge qty={lineQty} />

      {/* Счётчик найденного: − [ N ] / need + */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0.5,
          flexShrink: 0,
        }}
      >
        <IconButton
          size="small"
          aria-label="убавить"
          disabled={locked || shown <= minCount}
          onClick={() => commit(shown - 1)}
          sx={{ borderRadius: 0 }}
        >
          <RemoveIcon fontSize="inherit" />
        </IconButton>
        <InputBase
          value={text}
          disabled={locked}
          inputProps={{
            inputMode: 'numeric',
            'aria-label': `найдено ${name}`,
          }}
          onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={() => commit(text)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          sx={{
            width: 40,
            fontFamily: '"JetBrains Mono", monospace',
            '& input': { textAlign: 'center', padding: 0 },
          }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ pr: 0.75, fontFamily: '"JetBrains Mono", monospace', whiteSpace: 'nowrap' }}
        >
          /{need}
        </Typography>
        <IconButton
          size="small"
          aria-label="добавить"
          disabled={locked || shown >= need}
          onClick={() => commit(shown + 1)}
          sx={{ borderRadius: 0 }}
        >
          <AddIcon fontSize="inherit" />
        </IconButton>
      </Box>

      {/* Галочка = «собрано полностью» (справа): ставит need, снимает — minCount */}
      <Checkbox
        checked={done}
        disabled={locked}
        onChange={toggleDone}
        size="small"
        sx={{ p: 0.5, ml: 0.5 }}
      />
    </Box>
  )
}
