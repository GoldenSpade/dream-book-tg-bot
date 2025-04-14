// addUser.js
import { User } from '../../data/db.js'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function addUserManually() {
  const userData = {
    userId: 12345678912, // Укажи Telegram ID
    firstName: 'Иван',
    userName: 'ivan_the_user', // 🔧 Исправлено: было userName
    chatId: 123456789,
    language: 'ru',
  }

  try {
    const [user, created] = await User.findOrCreate(userData)

    if (created) {
      console.log(`✅ Пользователь добавлен: ${user.firstName}, ID: ${user.userId}`)
    } else {
      console.log(`ℹ️ Пользователь уже существует: ${user.firstName}, ID: ${user.userId}`)
    }
  } catch (err) {
    console.error('❌ Ошибка при добавлении пользователя:', err)
  }
}

addUserManually()
