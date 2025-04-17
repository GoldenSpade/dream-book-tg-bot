import readline from 'readline'
import { db } from '../../data/db.js'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve))
}

async function main() {
  console.log('🔧 Обновление пользователя\n')

  const userId = await ask('Введите userId: ')
  if (!userId) return console.log('❌ userId не указан')

  const user = db.prepare('SELECT * FROM Users WHERE userId = ?').get(userId)

  if (!user) {
    console.log('❌ Пользователь не найден.')
    rl.close()
    return
  }

  console.log('\n👤 Найден пользователь:')
  console.table({
    userId: user.userId,
    limit: user.limit,
    premiumSince: user.premiumSince,
  })

  const field = await ask('\nЧто изменить? (limit/premium): ')

  if (field === 'limit') {
    const newLimit = await ask('Введите новое значение лимита: ')
    db.prepare('UPDATE Users SET "limit" = ? WHERE userId = ?').run(
      Number(newLimit),
      userId
    )
    console.log('✅ Лимит обновлён.')
  } else if (field === 'premium') {
    const newDate = await ask(
      'Введите дату окончания премиума (в формате ГГГГ-ММ-ДД): '
    )
    const time = await ask('Введите время (чч:мм:сс), по умолчанию 00:00:00: ')
    const dateTime = new Date(`${newDate}T${time || '00:00:00'}`).toISOString()

    db.prepare('UPDATE Users SET premiumSince = ? WHERE userId = ?').run(
      dateTime,
      userId
    )
    console.log(`✅ Дата премиума обновлена: ${dateTime}`)
  } else {
    console.log('❌ Неизвестное поле. Введите "limit" или "premium".')
  }

  rl.close()
}

main()
