// admin/DB_Scripts/addReferrerIdToButtonActions.js
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

// Эмуляция __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.resolve(__dirname, '../../data/database.sqlite')
const db = new Database(dbPath)

try {
  const columns = db.prepare(`PRAGMA table_info(ButtonActions)`).all()
  const hasRefColumn = columns.some((col) => col.name === 'referrerId')

  if (!hasRefColumn) {
    db.prepare(`ALTER TABLE ButtonActions ADD COLUMN referrerId INTEGER`).run()
    console.log('✅ Поле referrerId добавлено в таблицу ButtonActions.')
  } else {
    console.log('ℹ️ Поле referrerId уже существует. Ничего не меняем.')
  }
} catch (error) {
  console.error('❌ Ошибка миграции:', error)
}
