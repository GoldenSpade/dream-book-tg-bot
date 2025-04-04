import Database from 'better-sqlite3'

// Подключение к базе данных
const db = new Database('./data/database.sqlite')

// Включаем WAL-режим для лучшей производительности
db.pragma('journal_mode = WAL')

// Создание таблицы пользователей, если она не существует
db.prepare(`
  CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER UNIQUE NOT NULL,
    firstName TEXT,
    username TEXT,
    lastActivity TEXT DEFAULT (datetime('now')),
    isPremium INTEGER DEFAULT 0,
    premiumSince TEXT
  )
`).run()

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
        'UPDATE Users SET lastActivity = datetime(\'now\') WHERE userId = ?'
      ).run(userId)
      return [user, false]
    } else {
      // Создаем нового пользователя
      const result = db.prepare(`
        INSERT INTO Users (userId, firstName, username)
        VALUES (?, ?, ?)
      `).run(
        userId,
        firstName || null,
        username || null
      )

      user = db.prepare('SELECT * FROM Users WHERE id = ?').get(result.lastInsertRowid)
      return [user, true]
    }
  },

  update: async (userId, data) => {
    const fields = Object.keys(data)
    if (fields.length === 0) return

    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => data[field])
    values.push(userId)

    db.prepare(`UPDATE Users SET ${setClause} WHERE userId = ?`).run(...values)

    return db.prepare('SELECT * FROM Users WHERE userId = ?').get(userId)
  }
}

export { User, initDB }