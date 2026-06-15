import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RestartAltIcon from '@mui/icons-material/RestartAlt'

// Карточка одного предмета Каппы: крупная иконка + подпись. Клик = отметить.
// Загрузка картинки с заглушкой (как в ItemRow), чтобы не мелькало чёрным.
function KappaCard({ item, found, onToggle }) {
  const [imgState, setImgState] = useState('loading')

  return (
    <Paper
      onClick={() => onToggle(item.id)}
      sx={{
        position: 'relative',
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        cursor: 'pointer',
        userSelect: 'none',
        backgroundColor: found ? 'rgba(76,175,80,0.18)' : undefined,
        borderColor: found ? 'success.main' : 'divider',
        transition: 'background-color 120ms',
        '&:hover': { borderColor: found ? 'success.main' : 'primary.main' },
      }}
    >
      {found && (
        <CheckCircleIcon
          fontSize="small"
          sx={{ position: 'absolute', top: 4, right: 4, color: 'success.main' }}
        />
      )}

      {/* Крупная иконка ~96×96 по центру */}
      <Box
        sx={{
          position: 'relative',
          width: 96,
          height: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#15140f',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0.5,
          overflow: 'hidden',
        }}
      >
        {(!item.icon || imgState !== 'ok') && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ px: 0.5, textAlign: 'center', lineHeight: 1.1 }}
          >
            {item.short || '?'}
          </Typography>
        )}
        {item.icon && imgState !== 'error' && (
          <Box
            component="img"
            src={item.icon}
            alt={item.name}
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

      {/* Подпись: до 2 строк с многоточием */}
      <Typography
        variant="caption"
        title={item.name}
        sx={{
          textAlign: 'center',
          lineHeight: 1.15,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {item.name}
      </Typography>
    </Paper>
  )
}

// Окно «Каппа» — предметы квеста «Коллекционер». Бинарная отметка (по 1 шт.).
// Найденные уезжают вниз, но остаются видимыми.
export default function KappaView({ items, found, onToggle, onReset }) {
  const [resetOpen, setResetOpen] = useState(false)

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const fa = found[a.id] ? 1 : 0
      const fb = found[b.id] ? 1 : 0
      if (fa !== fb) return fa - fb // ненайденные сверху
      return a.name.localeCompare(b.name)
    })
  }, [items, found])

  const total = items.length
  const done = items.filter((it) => found[it.id]).length

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Собрано <b style={{ color: '#c7a26b' }}>{done}</b> из {total} предметов
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          color="error"
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={() => setResetOpen(true)}
          disabled={done === 0}
        >
          Сбросить Каппу
        </Button>
      </Box>

      {/* Подтверждение сброса — чистит ТОЛЬКО Каппу */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)}>
        <DialogTitle>Сбросить отметки Каппы?</DialogTitle>
        <DialogContent>
          <Typography>
            Будут сняты все отметки найденных предметов Каппы. Прогресс убежища
            не затрагивается.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              onReset()
              setResetOpen(false)
            }}
          >
            Сбросить
          </Button>
        </DialogActions>
      </Dialog>

      {total === 0 ? (
        <Paper>
          <Typography color="text.secondary" sx={{ p: 2, fontStyle: 'italic' }}>
            Список предметов Каппы пуст. Запустите{' '}
            <code>npm run build:kappa</code>, чтобы загрузить данные.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 1.5,
            alignItems: 'start',
          }}
        >
          {sorted.map((it) => (
            <KappaCard key={it.id} item={it} found={!!found[it.id]} onToggle={onToggle} />
          ))}
        </Box>
      )}
    </Box>
  )
}
