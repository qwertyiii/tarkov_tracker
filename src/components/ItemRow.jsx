import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import Typography from '@mui/material/Typography'
import { FirBadge, OptionalBadge, QtyBadge } from './Badges'

// One collectible row used by both windows. `collected` controls the dimmed /
// archived look. `subtitle` is the optional "where used" / level hint.
export default function ItemRow({
  name,
  qty,
  fir,
  optional,
  collected,
  onToggle,
  subtitle,
}) {
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
        opacity: collected ? 0.45 : 1,
        transition: 'opacity 120ms',
        '&:hover': { backgroundColor: 'rgba(199,162,107,0.06)' },
      }}
    >
      <Checkbox
        checked={!!collected}
        onChange={(e) => onToggle(e.target.checked)}
        size="small"
        sx={{ p: 0.5 }}
      />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Typography
            sx={{
              fontWeight: 500,
              textDecoration: collected ? 'line-through' : 'none',
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
      <QtyBadge qty={qty} />
    </Box>
  )
}
