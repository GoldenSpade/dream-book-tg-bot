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
    const chatIdInput = await ask('Введите chatId (можно оставить пустым): ')
    const firstName = await ask(
      'Введите имя пользователя Telegram (firstName): '
    )
    const userName = await ask('Введите userName (можно оставить пустым): ')
    const language = await ask('Введите язык (например, ru): ')
    const premiumSince = await ask(
      'Введите дату премиума (например, 2025-05-01T00:00:00.000Z, можно оставить пустым): '
    )
    const limitInput = await ask(
      'Введите количество оставшихся гаданий (целое число): '
    )
    const refCountInput = await ask(
      'Введите количество приглашённых рефералов: '
    )
    const refBonusInput = await ask(
      'Введите количество бонусных гаданий за рефералов: '
    )

    const userId = parseInt(userIdInput.trim())
    const chatId = chatIdInput.trim() ? parseInt(chatIdInput.trim()) : null
    const limit = limitInput.trim() ? parseInt(limitInput.trim()) : 0
    const refCount = refCountInput.trim() ? parseInt(refCountInput.trim()) : 0
    const refBonus = refBonusInput.trim() ? parseInt(refBonusInput.trim()) : 0

    if (!userId || isNaN(userId)) {
      throw new Error('❌ Некорректный userId')
    }

    const userData = {
      userId,
      chatId,
      firstName: firstName.trim() || null,
      userName: userName.trim() || null,
      language: language.trim() || null,
      premiumSince: premiumSince.trim() || null,
      limit,
      refCount,
      refBonus,
      lastActivity: new Date().toISOString(),
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
