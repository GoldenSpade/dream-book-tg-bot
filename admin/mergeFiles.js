// admin/mergedAllCode.js (ES module)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Эмуляция __dirname в ES-модулях:
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Папка, откуда начинать обход всех JS-файлов
const projectRoot = path.resolve(__dirname, '../') // корень проекта

// Путь к выходному файлу
const outputFile = path.resolve(projectRoot, 'data/export/merged_output.js')

// Убедимся, что папка data/export существует
const exportDir = path.dirname(outputFile)
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true })
}

function readAllFiles(dirPath, allFiles = []) {
  const files = fs.readdirSync(dirPath)

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      // Пропускаем node_modules и папку export
      if (!['node_modules', 'data/export'].includes(path.relative(projectRoot, fullPath))) {
        readAllFiles(fullPath, allFiles)
      }
    } else if (stat.isFile() && file.endsWith('.js')) {
      allFiles.push(fullPath)
    }
  })

  return allFiles
}

const allJSFiles = readAllFiles(projectRoot)
const mergedContent = allJSFiles
  .map((filePath) => {
    const code = fs.readFileSync(filePath, 'utf8')
    return `// FILE: ${path.relative(projectRoot, filePath)}\n${code}`
  })
  .join('\n\n')

fs.writeFileSync(outputFile, mergedContent)
console.log(`Объединено ${allJSFiles.length} файлов в ${outputFile}`)
