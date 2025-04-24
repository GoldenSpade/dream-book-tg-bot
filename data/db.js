import Database from 'better-sqlite3'

// Подключение к базе данных
const db = new Database('./data/database.sqlite')

// Включаем WAL-режим для лучшей производительности
db.pragma('journal_mode = WAL')

// Увеличиваем размер кэша: до 10 Мб
db.pragma('cache_size = -10000') // 10 MB кэша

// Оптимизация синхронизации (риск потери данных при сбое):
db.pragma('synchronous = NORMAL') // или OFF для временных данных

// Создание таблицы пользователей, если она не существует
db.prepare(
  `
CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER UNIQUE NOT NULL,
    chatId INTEGER,
    firstName TEXT,
    userName TEXT,
    language TEXT,
    lastActivity TEXT DEFAULT (datetime('now')),
    premiumSince TEXT,
    "limit" INTEGER DEFAULT 0,
    refCount INTEGER DEFAULT 0,
    refBonus INTEGER DEFAULT 0
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
    referrerId INTEGER,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES Users(userId)
  )
`
).run()

// Индексы для таблицы Users
db.prepare('CREATE INDEX IF NOT EXISTS idx_users_userId ON Users(userId)').run()
db.prepare(
  'CREATE INDEX IF NOT EXISTS idx_users_lastActivity ON Users(lastActivity)'
).run()
db.prepare(
  'CREATE INDEX IF NOT EXISTS idx_users_userName ON Users(userName)'
).run()
db.prepare('CREATE INDEX IF NOT EXISTS idx_users_chatId ON Users(chatId)').run()
// Индексы для таблицы SearchQueries
db.prepare(
  'CREATE INDEX IF NOT EXISTS idx_search_queries_user ON SearchQueries(userId)'
).run()
db.prepare(
  'CREATE INDEX IF NOT EXISTS idx_search_queries_query ON SearchQueries(query)'
).run()
// Индексы для таблицы ButtonActions
db.prepare(
  'CREATE INDEX IF NOT EXISTS idx_button_actions_user ON ButtonActions(userId)'
).run()
db.prepare(
  'CREATE INDEX IF NOT EXISTS idx_button_actions_type ON ButtonActions(buttonType)'
).run()

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
  findOrCreate: async ({
    userId,
    firstName,
    userName,
    chatId,
    language,
    lastActivity,
    premiumSince,
    limit,
    refCount,
    refBonus,
  }) => {
    if (!userId) throw new Error('userId is required')

    let user = db.prepare('SELECT * FROM Users WHERE userId = ?').get(userId)

    if (user) {
      db.prepare(
        "UPDATE Users SET lastActivity = datetime('now'), chatId = ?, language = ? WHERE userId = ?"
      ).run(chatId || null, language || null, userId)
      return [user, false]
    } else {
      const result = db
        .prepare(
          `
          INSERT INTO Users (
            userId, firstName, userName, chatId, language, lastActivity,
            premiumSince, "limit", refCount, refBonus
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
        .run(
          userId,
          firstName || null,
          userName || null,
          chatId || null,
          language || null,
          lastActivity || new Date().toISOString(),
          premiumSince || null,
          limit || 0,
          refCount || 0,
          refBonus || 0
        )

      user = db
        .prepare('SELECT * FROM Users WHERE id = ?')
        .get(result.lastInsertRowid)
      return [user, true]
    }
  },

  update: async (userId, data) => {
    const fields = Object.keys(data)
    if (fields.length === 0) return

    const setClause = fields.map((field) => `"${field}" = ?`).join(', ')
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
  logButtonAction: (
    userId,
    buttonType,
    buttonData = null,
    referrerId = null
  ) => {
    db.prepare(
      `INSERT INTO ButtonActions (userId, buttonType, buttonData, referrerId)
       VALUES (?, ?, ?, ?)`
    ).run(userId, buttonType, buttonData, referrerId)
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

export { User, Activity, initDB, db }
