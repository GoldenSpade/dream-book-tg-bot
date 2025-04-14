import Database from 'better-sqlite3'
import { setTimeout } from 'timers/promises'
import os from 'os'

// Конфигурация
const DB_FILE = 'testDB_MaxWriteLoad.db'
const THREADS = os.cpus().length * 10 // Число потоков (например, 40 для 4-ядерного CPU)
const TOTAL_OPERATIONS = 5000 // Общее количество операций записи
const WRITE_DELAY_MS = 0 // Искусственная задержка между запросами (0 для максимальной нагрузки)

// Инициализация БД
const db = new Database(DB_FILE)
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('cache_size = -10000') // 10 МБ кэша

// Создаем тестовую таблицу
db.exec(`
  CREATE TABLE IF NOT EXISTS WriteTest (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threadId INTEGER,
    data TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// Очищаем таблицу перед тестом
db.prepare('DELETE FROM WriteTest').run()

// Подготовленные запросы
const insertStmt = db.prepare(`
  INSERT INTO WriteTest (threadId, data) VALUES (?, ?)
`)
const updateStmt = db.prepare(`
  UPDATE WriteTest SET data = ?, timestamp = CURRENT_TIMESTAMP WHERE id = ?
`)
const selectStmt = db.prepare('SELECT COUNT(*) as count FROM WriteTest')

// Статистика
let completedOps = 0
let errors = 0

// Запуск потоков с записью
async function runWriteStressTest() {
  const startTime = Date.now()

  const threads = Array(THREADS)
    .fill()
    .map(async (_, threadId) => {
      for (let i = 0; i < Math.ceil(TOTAL_OPERATIONS / THREADS); i++) {
        try {
          // Чередуем INSERT и UPDATE для реалистичной нагрузки
          if (Math.random() > 0.5) {
            insertStmt.run(threadId, `Data-${threadId}-${i}`)
          } else {
            const row = db.prepare('SELECT id FROM WriteTest LIMIT 1').get()
            if (row) updateStmt.run(`Updated-${threadId}`, row.id)
          }
          completedOps++
        } catch (err) {
          errors++
          console.error(`Поток ${threadId}:`, err.message)
        }
        if (WRITE_DELAY_MS > 0) await setTimeout(WRITE_DELAY_MS)
      }
    })

  await Promise.all(threads)
  const totalTime = Date.now() - startTime

  // Итоги
  const rows = selectStmt.get().count
  console.log(`
=== Результаты теста записи ===
Потоков:          ${THREADS}
Операций всего:   ${completedOps} (${errors} ошибок)
Записей в БД:     ${rows}
Общее время:      ${totalTime} мс
Операций/сек:     ${Math.round(completedOps / (totalTime / 1000))}
Средняя задержка: ${(totalTime / completedOps).toFixed(2)} мс
Режим:            ${db.pragma('journal_mode', { simple: true })}
  `)
}

// Запуск
runWriteStressTest().catch(console.error)
