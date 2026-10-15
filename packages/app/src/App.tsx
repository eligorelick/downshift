import { Layout } from './components/Layout'
import { BreathePage } from './pages/BreathePage'
import { Device } from './pages/Device'
import { EvidencePage } from './pages/EvidencePage'
import { FocusPage } from './pages/FocusPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { Settings } from './pages/Settings'
import { type PageKey, useRoute } from './state/route'

const PAGES: Record<PageKey, () => JSX.Element> = {
  home: HomePage,
  focus: FocusPage,
  breathe: BreathePage,
  history: HistoryPage,
  device: Device,
  evidence: EvidencePage,
  settings: Settings,
}

export function App() {
  const { page } = useRoute()
  const Page = PAGES[page]
  return (
    <Layout page={page}>
      <Page />
    </Layout>
  )
}
