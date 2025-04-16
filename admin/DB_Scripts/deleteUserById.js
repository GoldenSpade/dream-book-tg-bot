import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import readline from 'readline'

// Путь к базе
const DB_PATH = path.resolve('data', 'database.sqlite')

// Проверка базы
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ База данных не найдена по пути:', DB_PATH)
  process.exit(1)
}

// Создаём интерфейс ввода
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Функция запроса ID
function askUserId() {
  rl.question('🆔 Введите userId пользователя для удаления: ', (input) => {
    const userId = parseInt(input)
    if (isNaN(userId)) {
      console.error('❌ Введён некорректный userId. Это должно быть число.')
      rl.close()
      process.exit(1)
    }
    deleteUser(userId)
  })
}

// Основная логика удаления
function deleteUser(userId) {
  const db = new Database(DB_PATH)
  try {
    const user = db.prepare('SELECT * FROM Users WHERE userId = ?').get(userId)

    if (!user) {
      console.log(`⚠️ Пользователь с userId = ${userId} не найден.`)
      rl.close()
      db.close()
      return
    }

    console.log(
      `👤 Найден пользователь: ${user.firstName || '—'} (@${
        user.userName || '—'
      })`
    )
    rl.question(
      '❓ Удалить этого пользователя и все его данные? (y/n): ',
      (confirm) => {
        if (confirm.toLowerCase() === 'y') {
          const deletedSearches = db
            .prepare('DELETE FROM SearchQueries WHERE userId = ?')
            .run(userId).changes

          const deletedButtons = db
            .prepare('DELETE FROM ButtonActions WHERE userId = ?')
            .run(userId).changes

          const deletedUser = db
            .prepare('DELETE FROM Users WHERE userId = ?')
            .run(userId).changes

          console.log(`✅ Удалено:
  • Пользователь: ${deletedUser}
  • Поисковые запросы: ${deletedSearches}
  • Нажатия кнопок: ${deletedButtons}
        `)
        } else {
          console.log('❌ Удаление отменено.')
        }

        rl.close()
        db.close()
      }
    )
  } catch (err) {
    console.error('❌ Ошибка при удалении:', err)
    rl.close()
    db.close()
  }
}

askUserId()
