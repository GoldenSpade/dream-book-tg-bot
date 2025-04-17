//* Удалить из Users поле isPremium
//* Создадим временную таблицу без isPremium
//* Скопируем данные
//* Удалим оригинал
//* Переименуем новую таблицу обратно

import Database from 'better-sqlite3'

// Подключение к базе
const db = new Database('./data/database.sqlite')

// Начинаем транзакцию
db.transaction(() => {
  console.log('⏳ Создание временной таблицы без isPremium...')

  // 1. Создаём временную таблицу без isPremium
  db.prepare(
    `
    CREATE TABLE Users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER UNIQUE NOT NULL,
      chatId INTEGER,
      firstName TEXT,
      userName TEXT,
      language TEXT,
      lastActivity TEXT DEFAULT (datetime('now')),
      premiumSince TEXT,
      "limit" INTEGER DEFAULT 0
    )
  `
  ).run()

  console.log('📥 Копирование данных...')
  // 2. Копируем данные из старой таблицы
  db.prepare(
    `
    INSERT INTO Users_new (id, userId, chatId, firstName, userName, language, lastActivity, premiumSince, "limit")
    SELECT id, userId, chatId, firstName, userName, language, lastActivity, premiumSince, "limit"
    FROM Users
  `
  ).run()

  console.log('🧹 Удаление старой таблицы...')
  // 3. Удаляем оригинальную таблицу
  db.prepare(`DROP TABLE Users`).run()

  console.log('🔄 Переименование новой таблицы...')
  // 4. Переименовываем новую таблицу в Users
  db.prepare(`ALTER TABLE Users_new RENAME TO Users`).run()

  console.log('✅ Столбец isPremium удалён.')
})()
