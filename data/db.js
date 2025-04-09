import Database from 'better-sqlite3'

// Подключение к базе данных
const db = new Database('./data/database.sqlite')

// Включаем WAL-режим для лучшей производительности
db.pragma('journal_mode = WAL')

// Увеличиваем размер кэша: до 10 Мб
db.pragma('cache_size = -10000'); // 10 MB кэша

// Оптимизация синхронизации (риск потери данных при сбое):
db.pragma('synchronous = NORMAL'); // или OFF для временных данных

// Создание таблицы пользователей, если она не существует
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER UNIQUE NOT NULL,
    firstName TEXT,
    username TEXT,
    lastActivity TEXT DEFAULT (datetime('now')),
    isPremium INTEGER DEFAULT 0,
    premiumSince TEXT
  )
`
).run()

// Создание таблицы для поисковых запросов
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS SearchQueries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    query TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES Users(userId)
  )
`
).run()

// Создание таблицы для действий с кнопками
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS ButtonActions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    buttonType TEXT NOT NULL,
    buttonData TEXT,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES Users(userId)
  )
`
).run()

// Добавить в db.js после создания таблиц
db.prepare('CREATE INDEX IF NOT EXISTS idx_search_queries_user ON SearchQueries(userId)').run()
db.prepare('CREATE INDEX IF NOT EXISTS idx_search_queries_query ON SearchQueries(query)').run()
db.prepare('CREATE INDEX IF NOT EXISTS idx_button_actions_user ON ButtonActions(userId)').run()
db.prepare('CREATE INDEX IF NOT EXISTS idx_button_actions_type ON ButtonActions(buttonType)').run()

// Функция для инициализации БД
async function initDB() {
  try {
    console.log('База данных подключена')
  } catch (error) {
    console.error('Ошибка подключения к БД:', error)
  }
}

// Методы для работы с пользователями
const User = {
  findOrCreate: async ({ userId, firstName, username }) => {
    if (!userId) {
      throw new Error('userId is required')
    }

    // Проверяем существование пользователя
    let user = db.prepare('SELECT * FROM Users WHERE userId = ?').get(userId)

    if (user) {
      // Обновляем дату последней активности (исправленная строка)
      db.prepare(
        "UPDATE Users SET lastActivity = datetime('now') WHERE userId = ?"
      ).run(userId)
      return [user, false]
    } else {
      // Создаем нового пользователя
      const result = db
        .prepare(
          `
        INSERT INTO Users (userId, firstName, username)
        VALUES (?, ?, ?)
      `
        )
        .run(userId, firstName || null, username || null)

      user = db
        .prepare('SELECT * FROM Users WHERE id = ?')
        .get(result.lastInsertRowid)
      return [user, true]
    }
  },

  update: async (userId, data) => {
    const fields = Object.keys(data)
    if (fields.length === 0) return

    const setClause = fields.map((field) => `${field} = ?`).join(', ')
    const values = fields.map((field) => data[field])
    values.push(userId)

    db.prepare(`UPDATE Users SET ${setClause} WHERE userId = ?`).run(...values)

    return db.prepare('SELECT * FROM Users WHERE userId = ?').get(userId)
  },
}

// Сохранение активности в БД
const Activity = {
  // Запись поискового запроса
  logSearchQuery: (userId, query) => {
    db.prepare(
      `
      INSERT INTO SearchQueries (userId, query)
      VALUES (?, ?)
    `
    ).run(userId, query)
  },

  // Запись нажатия кнопки
  logButtonAction: (userId, buttonType, buttonData = null) => {
    db.prepare(
      `
      INSERT INTO ButtonActions (userId, buttonType, buttonData)
      VALUES (?, ?, ?)
    `
    ).run(userId, buttonType, buttonData)
  },

  // Получение статистики поисковых запросов
  getSearchStats: (limit = 20) => {
    return db
      .prepare(
        `
      SELECT query, COUNT(*) as count
      FROM SearchQueries
      GROUP BY query
      ORDER BY count DESC
      LIMIT ?
    `
      )
      .all(limit)
  },

  // Получение статистики кнопок
  getButtonStats: (limit = 10) => {
    return db
      .prepare(
        `
      SELECT buttonType, COUNT(*) as count
      FROM ButtonActions
      GROUP BY buttonType
      ORDER BY count DESC
      LIMIT ?
    `
      )
      .all(limit)
  },
}

export { User, Activity, initDB }
