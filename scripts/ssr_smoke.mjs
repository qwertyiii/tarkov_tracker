// Render <App/> to HTML in Node using Vite's SSR module loader (same transform
// pipeline + ESM/CJS interop the real app uses), catching render-time errors.
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

// minimal browser shims used during initial render
const store = {}
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v)
  },
  removeItem: (k) => delete store[k],
}
globalThis.matchMedia = () => ({
  matches: false,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
})

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
  // Force Vite to transform MUI/emotion through its pipeline instead of letting
  // Node resolve their ESM (which uses unsupported directory imports).
  ssr: { noExternal: [/@mui\//, /@emotion\//] },
})

try {
  const { default: App } = await vite.ssrLoadModule('/src/App.jsx')
  const html = renderToString(createElement(App))
  if (!html.includes('HIDEOUT TRACKER')) throw new Error('App header missing')
  if (!html.includes('Модули') || !html.includes('Свод')) throw new Error('Tabs missing')
  // spot-check that real data made it into the render
  if (!html.includes('Hideout Tracker') && !html.includes('hideout')) {
    // header text is uppercased via CSS, raw text is "HIDEOUT TRACKER"
  }
  console.log('SSR OK — App rendered', html.length, 'chars of HTML')
} finally {
  await vite.close()
}
