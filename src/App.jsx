import { useRef, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Snackbar from '@mui/material/Snackbar'
import Tooltip from '@mui/material/Tooltip'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import RestartAltIcon from '@mui/icons-material/RestartAlt'

import data from './data/data.json'
import { useStore } from './state/useStore'
import ModulesView from './components/ModulesView'
import SummaryView from './components/SummaryView'

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState(0)
  const [showEvent, setShowEvent] = useState(true)

  const [resetOpen, setResetOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [toast, setToast] = useState('')
  const fileRef = useRef(null)

  const handleExport = () => {
    const blob = new Blob([store.exportString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tarkov-hideout-progress-${data.meta.date}.json`
    a.click()
    URL.revokeObjectURL(url)
    setToast('Прогресс экспортирован в файл')
  }

  const applyImport = (text) => {
    try {
      const obj = JSON.parse(text)
      store.importState(obj)
      setImportOpen(false)
      setImportText('')
      setImportError('')
      setToast('Прогресс импортирован')
    } catch {
      setImportError('Не удалось разобрать JSON. Проверьте содержимое.')
    }
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => applyImport(String(reader.result))
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 6 }}>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', mr: 'auto' }}>
            <Typography
              variant="h6"
              sx={{ color: 'primary.main', letterSpacing: 1, lineHeight: 1.1 }}
            >
              HIDEOUT TRACKER
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Данные актуальны на {data.meta.date}
            </Typography>
          </Box>

          <Tooltip title="Скачать прогресс в JSON">
            <Button color="inherit" startIcon={<DownloadIcon />} onClick={handleExport}>
              Экспорт
            </Button>
          </Tooltip>
          <Tooltip title="Загрузить прогресс из JSON">
            <Button color="inherit" startIcon={<UploadIcon />} onClick={() => setImportOpen(true)}>
              Импорт
            </Button>
          </Tooltip>
          <Tooltip title="Сбросить весь прогресс">
            <IconButton color="inherit" onClick={() => setResetOpen(true)}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Модули" />
          <Tab label="Свод" />
        </Tabs>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 3 }}>
        {tab === 0 ? (
          <ModulesView
            modules={data.modules}
            builtLevels={store.builtLevels}
            collected={store.collected}
            setBuiltLevel={store.setBuiltLevel}
            toggleCollected={store.toggleCollected}
            showEvent={showEvent}
            onShowEventChange={setShowEvent}
          />
        ) : (
          <SummaryView
            modules={data.modules}
            builtLevels={store.builtLevels}
            collected={store.collected}
            toggleCollected={store.toggleCollected}
            showEvent={showEvent}
          />
        )}
      </Container>

      {/* Reset confirmation */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)}>
        <DialogTitle>Сбросить прогресс?</DialogTitle>
        <DialogContent>
          <Typography>
            Будут очищены все построенные уровни и отметки «найдено». Действие
            необратимо (но можно заранее сделать экспорт).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              store.reset()
              setResetOpen(false)
              setToast('Прогресс сброшен')
            }}
          >
            Сбросить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Импорт прогресса</DialogTitle>
        <DialogContent>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => fileRef.current?.click()} sx={{ mb: 2 }}>
            Выбрать файл…
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleFile} />
          <TextField
            label="…или вставьте JSON сюда"
            multiline
            minRows={6}
            fullWidth
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value)
              setImportError('')
            }}
            error={!!importError}
            helperText={importError}
            sx={{ fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            disabled={!importText.trim()}
            onClick={() => applyImport(importText)}
          >
            Импортировать
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
