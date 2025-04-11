import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'
import readline from 'readline'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '../../data/database.sqlite')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase())
    })
  })
}

// Проверяем существование таблицы
function tableExists(tableName) {
  try {
    const result = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `
      )
      .get(tableName)
    return !!result
  } catch (error) {
    console.error(`Ошибка при проверке таблицы ${tableName}:`, error)
    return false
  }
}

async function cleanupTables() {
  try {
    console.log('=== Полная очистка таблиц ===')

    // Проверяем существование таблиц
    const tablesToClean = ['SearchQueries', 'ButtonActions']
    const existingTables = tablesToClean.filter(tableExists)

    if (existingTables.length === 0) {
      console.log('Таблицы для очистки не найдены в базе данных.')
      return
    }

    console.log('Будут очищены:')
    existingTables.forEach((table) => console.log(`- ${table}`))
    console.log('\nТаблица Users НЕ будет затронута!')

    // Получаем статистику
    const counts = {}
    for (const table of existingTables) {
      counts[table] = db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get()
      console.log(`- Записей в ${table}: ${counts[table]}`)
    }

    // Подтверждение
    const answer = await askQuestion(
      '\nВы уверены? Это действие нельзя отменить! (y/n): '
    )
    if (answer !== 'y') {
      console.log('Очистка отменена')
      return
    }

    // Очистка
    console.log('\nНачало очистки...')
    const results = {}

    for (const table of existingTables) {
      try {
        results[table] = db.prepare(`DELETE FROM ${table}`).run().changes
        console.log(`- Очищено ${results[table]} записей из ${table}`)
      } catch (error) {
        console.error(`Ошибка при очистке ${table}:`, error.message)
        results[table] = 0
      }
    }

    // Оптимизация
    try {
      db.prepare('VACUUM').run()
      console.log('\nБаза данных оптимизирована (VACUUM)')
    } catch (error) {
      console.error('Ошибка при оптимизации:', error.message)
    }

    console.log('\nОчистка завершена!')
  } catch (error) {
    console.error('Критическая ошибка:', error.message)
  } finally {
    rl.close()
    db.close()
  }
}

// Запуск
cleanupTables()
