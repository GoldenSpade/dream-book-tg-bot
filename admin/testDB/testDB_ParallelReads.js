import Database from 'better-sqlite3'
import { setTimeout } from 'timers/promises'

// 1. Инициализация БД
const db = new Database('test.db')
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')

// 2. Тестовые данные
db.exec(`
  CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER UNIQUE,
    username TEXT
  )
`)

const testUserId = 1
db.prepare('INSERT OR IGNORE INTO Users (userId, username) VALUES (?, ?)').run(
  testUserId,
  'test_user'
)

// 3. Запуск 100 параллельных чтений
async function runMassiveParallelReads() {
  const stmt = db.prepare('SELECT * FROM Users WHERE userId = ?')
  const concurrency = 100 // Количество потоков
  let completed = 0

  const startTime = Date.now()

  // Запускаем потоки
  const threads = Array(concurrency)
    .fill()
    .map(async (_, i) => {
      while (completed < 1000) {
        // Читаем 1000 раз всего
        const start = Date.now()
        const user = stmt.get(testUserId)
        const duration = Date.now() - start

        completed++
        if (duration > 10) {
          console.log(`Поток ${i}: медленный запрос (${duration} мс)`)
        }
        await setTimeout(1) // Имитация работы
      }
    })

  await Promise.all(threads)
  const totalTime = Date.now() - startTime

  console.log(`
=== Результаты теста чтения ===
Потоков:          ${concurrency}
Всего запросов:   ${completed}
Общее время:      ${totalTime} мс
Запросов/сек:     ${Math.round(completed / (totalTime / 1000))}
Средняя задержка: ${(totalTime / completed).toFixed(2)} мс
Режим:            ${db.pragma('journal_mode', { simple: true })}
  `)
}

// 4. Фоновая запись (раскомментируйте для теста)
/* setInterval(() => {
  db.prepare("UPDATE Users SET username = 'updated' WHERE userId = ?")
    .run(testUserId);
}, 10); // 100 записей/сек */

// Запуск
runMassiveParallelReads().catch(console.error)
