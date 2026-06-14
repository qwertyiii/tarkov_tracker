import { createTheme } from '@mui/material/styles'

// Dark "Tarkov" theme: near-black background, warm amber accent, FIR badge in a
// warm red-orange so it jumps out. Single-file custom MUI theme.
const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0e0e0e',
      paper: '#23211c',
    },
    primary: {
      main: '#c7a26b', // amber accent
      contrastText: '#15140f',
    },
    secondary: {
      main: '#9a8866',
    },
    success: {
      main: '#7fa05a',
    },
    // warm red-orange FIR badge color, reachable as `color="error"`
    error: {
      main: '#d8693c',
    },
    text: {
      primary: '#e6e0d4',
      secondary: '#a59d8c',
    },
    divider: '#3a352c',
  },
  shape: {
    borderRadius: 2, // angular frames
  },
  typography: {
    fontFamily:
      '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    h6: { letterSpacing: 0.3 },
    button: {
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontWeight: 600,
    },
    // monospace accents for numbers / keys
    overline: {
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      letterSpacing: 1,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0e0e0e',
          backgroundImage:
            'linear-gradient(180deg, #14130f 0%, #0e0e0e 240px)',
          // Сглаживание, чтобы тонкий светлый текст не «рябил» на тёмном фоне
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '::-webkit-scrollbar': { width: 10, height: 10 },
        '::-webkit-scrollbar-thumb': {
          background: '#3a352c',
          border: '2px solid #0e0e0e',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #3a352c',
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: '#1a1916',
          borderBottom: '1px solid #3a352c',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 2 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 2, fontWeight: 600 },
      },
    },
    MuiAccordion: {
      defaultProps: { disableGutters: true },
      styleOverrides: {
        root: {
          backgroundColor: '#23211c',
          border: '1px solid #3a352c',
          '&:before': { display: 'none' },
          marginBottom: 8,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 },
      },
    },
  },
})

export default theme
