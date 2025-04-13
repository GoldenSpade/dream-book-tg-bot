import fs from 'fs'
import path from 'path'

// Цвета ANSI
const COLORS = {
  folder: '\x1b[36m',     // Cyan
  file: '\x1b[33m',       // Yellow
  reset: '\x1b[0m'        // Сброс цвета
}

function listFiles(dir, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return

  const ignoredDirs = ['node_modules', '.git']
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    if (ignoredDirs.includes(file)) return

    const fullPath = path.join(dir, file)
    const stats = fs.statSync(fullPath)

    const indent = '  '.repeat(depth)
    const displayName = stats.isDirectory()
      ? `${COLORS.folder}${file}${COLORS.reset}`
      : `${COLORS.file}${file}${COLORS.reset}`

    console.log(`${indent}|-- ${displayName}`)

    if (stats.isDirectory()) {
      listFiles(fullPath, depth + 1, maxDepth)
    }
  })
}

listFiles('./')
