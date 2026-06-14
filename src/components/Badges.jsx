import Chip from '@mui/material/Chip'

// FIR badge — warm red-orange (palette.error), meant to grab the eye (ТЗ 8).
export function FirBadge() {
  return (
    <Chip
      label="FIR"
      size="small"
      color="error"
      title="Found in Raid — нужен предмет, найденный в рейде"
      sx={{ height: 20, fontSize: 11, letterSpacing: 0.5 }}
    />
  )
}

export function OptionalBadge() {
  return (
    <Chip
      label="опц."
      size="small"
      variant="outlined"
      title="Опциональный предмет — не блокирует постройку уровня"
      sx={{ height: 20, fontSize: 11, color: 'text.secondary' }}
    />
  )
}

// Заметный янтарный пилюль с количеством, напр. ×5. Цифры моноширинные.
export function QtyBadge({ qty }) {
  return (
    <Chip
      label={`×${qty}`}
      size="small"
      variant="outlined"
      sx={{
        height: 26,
        fontSize: 15,
        fontWeight: 700,
        color: 'primary.main',
        borderColor: 'primary.main',
        fontFamily: '"JetBrains Mono", monospace',
      }}
    />
  )
}
