import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
// Renders public/icon.svg to the PNG sizes the manifest needs, using the Chromium that Playwright already installs.
import { chromium } from '@playwright/test'

const pub = join(import.meta.dir, '..', 'public')
const svg = readFileSync(join(pub, 'icon.svg'), 'utf8')
const targets: [string, number][] = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]

const browser = await chromium.launch()
for (const [name, size] of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  )
  writeFileSync(join(pub, name), await page.screenshot({ type: 'png' }))
  await page.close()
}
await browser.close()
