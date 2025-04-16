// Скрипт обновления любого поля пользователя в БД (табл. Users)
import readline from 'readline'
import { User } from '../../data/db.js'

// Интерфейс для ввода из консоли
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Вспомогательная функция для опроса
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

async function main() {
  try {
    console.log('🔧 Обновление поля пользователя в таблице Users\n')

    const userIdInput = await ask('Введите userId: ')
    const userId = parseInt(userIdInput.trim())

    if (!userId || isNaN(userId)) {
      throw new Error('Некорректный userId')
    }

    const field = (await ask('Введите имя поля (например, isPremium): ')).trim()
    const valueRaw = await ask('Введите новое значение: ')
    let value

    // Автоматически приводим типы:
    if (valueRaw === 'true') value = 1
    else if (valueRaw === 'false') value = 0
    else if (!isNaN(valueRaw)) value = Number(valueRaw)
    else value = valueRaw

    const result = await User.update(userId, { [field]: value })

    console.log('\n✅ Поле успешно обновлено. Текущий пользователь:')
    console.log(result)
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  } finally {
    rl.close()
  }
}

main()
