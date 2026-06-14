import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// "Прочие условия" block — currency / trader / module / skill / edition / wait.
// Text only, no checkboxes (ТЗ 5.3).
export default function Conditions({ conditions }) {
  if (!conditions || conditions.length === 0) return null
  return (
    <Box sx={{ mt: 1, pl: 1 }}>
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
      >
        Прочие условия
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {conditions.map((c, i) => (
          <Typography
            key={i}
            component="li"
            variant="body2"
            sx={{ color: 'text.secondary', py: 0.1 }}
          >
            <Box component="span" sx={{ color: 'primary.main', mr: 0.75 }}>
              [{c.type}]
            </Box>
            {c.text}
            {c.qty != null && (
              <Box
                component="span"
                sx={{ fontFamily: '"JetBrains Mono", monospace', ml: 0.75 }}
              >
                {c.qty.toLocaleString('ru-RU')}
              </Box>
            )}
          </Typography>
        ))}
      </Box>
    </Box>
  )
}
