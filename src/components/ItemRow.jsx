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
//   lineQty — сколько нужно в этом контексте (в Своде совпадает с need)
//   need    — сколько нужно по всему убежищу (максимум счётчика и порог «собрано»)
//   found   — сколько уже найдено (общий счётчик collected[itemKey])
//   onSetCount(n) — записать новое значение счётчика
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
  onSetCount,
  subtitle,
}) {
  // need мог уменьшиться после постройки уровня — не показываем больше нужного
  const shown = Math.min(found, need)
  const done = found >= need

  // Локальный текст поля ввода, чтобы можно было стирать/печатать; на blur и
  // через −/+ клампим в 0..need.
  const [text, setText] = useState(String(shown))
  useEffect(() => {
    setText(String(shown))
  }, [shown])

  const clamp = (n) => Math.max(0, Math.min(need, Math.round(Number(n) || 0)))

  const commit = (raw) => {
    const n = clamp(raw)
    onSetCount(n)
    setText(String(n))
  }

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
        opacity: done ? 0.45 : 1,
        transition: 'opacity 120ms',
        '&:hover': { backgroundColor: 'rgba(199,162,107,0.06)' },
      }}
    >
      {/* Картинка предмета (или заглушка). Клик = отметить/снять «собрано». */}
      <Box
        onClick={() => onSetCount(done ? 0 : need)}
        title="Отметить собранным"
        sx={{
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
          cursor: 'pointer',
        }}
      >
        {icon ? (
          <Box
            component="img"
            src={icon}
            alt={name}
            loading="lazy"
            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 11, px: 0.25, textAlign: 'center', lineHeight: 1 }}
          >
            {short || '?'}
          </Typography>
        )}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Typography
            sx={{
              fontWeight: 500,
              textDecoration: done ? 'line-through' : 'none',
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
          disabled={shown <= 0}
          onClick={() => commit(shown - 1)}
          sx={{ borderRadius: 0 }}
        >
          <RemoveIcon fontSize="inherit" />
        </IconButton>
        <InputBase
          value={text}
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
          disabled={shown >= need}
          onClick={() => commit(shown + 1)}
          sx={{ borderRadius: 0 }}
        >
          <AddIcon fontSize="inherit" />
        </IconButton>
      </Box>

      {/* Галочка = «собрано полностью» (справа): ставит found=need, снимает — 0 */}
      <Checkbox
        checked={done}
        onChange={(e) => onSetCount(e.target.checked ? need : 0)}
        size="small"
        sx={{ p: 0.5, ml: 0.5 }}
      />
    </Box>
  )
}
