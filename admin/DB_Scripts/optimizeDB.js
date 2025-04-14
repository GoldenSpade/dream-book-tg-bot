//* Скрипт оптимизации БД
// запускать когда БД сильно разрослась
// ериодически вручную, например:
// при запуске скрипта оптимизации (раз в неделю);
// после большого импорта/удаления данных;
//!Не запускать слишком часто в активных приложениях — VACUUM блокирует БД на время выполнения.
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const DB_PATH = path.resolve('data', 'database.sqlite')

// Функция для получения размера файла в мегабайтах
function getFileSizeMB(filePath) {
  const stats = fs.statSync(filePath)
  return (stats.size / (1024 * 1024)).toFixed(2)
}

// Подключаемся к БД
const db = new Database(DB_PATH)
console.log(`📦 Размер до оптимизации: ${getFileSizeMB(DB_PATH)} MB`)

try {
  console.log('🔍 Выполняется ANALYZE...')
  db.prepare('ANALYZE').run()
  console.log('✅ ANALYZE завершен.')

  console.log('🧹 Выполняется VACUUM...')
  db.prepare('VACUUM').run()
  console.log('✅ VACUUM завершен.')
} catch (error) {
  console.error('❌ Ошибка при оптимизации:', error)
  process.exit(1)
}

console.log(`📦 Размер после оптимизации: ${getFileSizeMB(DB_PATH)} MB`)
db.close()
