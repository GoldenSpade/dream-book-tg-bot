import readline from 'readline'
import { User } from '../../data/db.js'

// Интерфейс для ввода из консоли
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve))
}

async function addUserManually() {
  try {
    console.log('👤 Добавление пользователя в базу данных:\n')

    const userIdInput = await ask('Введите Telegram userId (число): ')
    const firstName = await ask('Введите имя пользователя Telegram (firstName): ')
    const userName = await ask('Введите userName (можно оставить пустым): ')
    const chatIdInput = await ask('Введите chatId (можно оставить пустым): ')
    const language = await ask('Введите язык (например, ru): ')

    const userId = parseInt(userIdInput.trim())
    const chatId = chatIdInput.trim() ? parseInt(chatIdInput.trim()) : null

    if (!userId || isNaN(userId)) {
      throw new Error('❌ Некорректный userId')
    }

    const userData = {
      userId,
      firstName: firstName.trim() || null,
      userName: userName.trim() || null,
      chatId,
      language: language.trim() || null,
    }

    const [user, created] = await User.findOrCreate(userData)

    if (created) {
      console.log(
        `✅ Пользователь добавлен: ${user.firstName}, ID: ${user.userId}`
      )
    } else {
      console.log(
        `ℹ️ Пользователь уже существует: ${user.firstName}, ID: ${user.userId}`
      )
    }
  } catch (err) {
    console.error('❌ Ошибка при добавлении пользователя:', err.message)
  } finally {
    rl.close()
  }
}

addUserManually()
