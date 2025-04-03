import { Telegraf, Markup } from 'telegraf'
import 'dotenv/config'
import { User, initDB } from './data/db.js'
import { data } from './data/data.js'
import { splitText } from './helpers/splitText.js'
import { searchItems } from './helpers/searchItems.js'
import { dateFromTimeStamp } from './helpers/dateFromTimeStamp.js'
import { getLunarDay } from './helpers/lunarDay.js'
import { getGregorianDay } from './helpers/gregorianDay.js'

const bot = new Telegraf(process.env.API_KEY)
const CACHE_TTL = 60 * 60 * 1000
const searchResults = new Map()
const sentMessages = new Map() // Хранилище ID отправленных сообщений

// Инициализация БД при запуске
await initDB()

// --- Клавиатуры ---
const mainMenu = Markup.keyboard([
  ['🔍 Поиск по слову', 'ℹ️ О боте'],
  ['🌙 Лунные сны', '📅 Календарные сны'],
  ['❓ Помощь'],
]).resize()

// --- Команды ---
bot.start(async (ctx) => {
  try {
    const { id, first_name, username } = ctx.from // Получаем данные пользователя из ctx.from

    // Проверяем существование пользователя и добавляем при необходимости
    const [user, created] = await User.findOrCreate({
      where: { userId: id },
      defaults: {
        firstName: first_name,
        username: username || null,
      },
    })

    if (created) {
      console.log(
        `✅ Новый пользователь: ${first_name}, ID: ${id}, Date: ${dateFromTimeStamp(
          ctx.message.date
        )}`
      )
    } else {
      console.log(
        `👋 Возвращение пользователя: ${first_name}, ID: ${id}, Date: ${dateFromTimeStamp(
          ctx.message.date
        )}`
      )
      // Обновляем дату последней активности
      await user.update({ lastActivity: new Date() })
    }

    ctx.reply(
      'Привет! Введите слово для поиска трактования сна или выберите опцию из меню.',
      mainMenu
    )
  } catch (err) {
    console.error('Ошибка при обработке /start:', err) // Используем console.error для ошибок
    ctx.reply(
      'Произошла ошибка при запуске бота. Пожалуйста, попробуйте позже.'
    )
  }
})

const commandHandlers = {
  '🔍 Поиск по слову': (ctx) => ctx.reply('Введите слово для поиска:'),
  'ℹ️ О боте': (ctx) =>
    ctx.reply(
      '🔮 Сонник с глубоким анализом. Напишите, что вам приснилось — и я расшифрую скрытые смыслы!'
    ),
  '❓ Помощь': (ctx) =>
    ctx.reply(
      'Для поиска трактования сна введите слово длиной >3 символов. Используйте "е" вместо "ё".'
    ),
  '🌙 Лунные сны': async (ctx) => {
    try {
      const moonInfo = getLunarDay()
      const shareText = `🌙 Лунный сонник:\n\n${moonInfo}\n\n✨ Больше толкований в Телеграм боте Шепот Морфея: https://t.me/${ctx.botInfo.username}`

      await ctx.reply(moonInfo)
      await ctx.reply(
        `🔗 Поделитесь толкованием лунных снов:`,
        Markup.inlineKeyboard([
          [
            Markup.button.url(
              '📤 Поделиться с друзьями',
              `https://t.me/share/url?url=${encodeURIComponent(
                `Толкование лунных снов`
              )}&text=${encodeURIComponent(shareText)}`
            ),
          ],
          [Markup.button.callback('🔙 В меню', 'back_to_menu')],
        ])
      )
    } catch (error) {
      console.error('Ошибка при обработке лунных снов:', error)
      ctx.reply('Произошла ошибка при получении информации о лунных снах.')
    }
  },
  '📅 Календарные сны': async (ctx) => {
    try {
      const gregorianInfo = getGregorianDay()
      const shareText = `📅 Календарный сонник:\n\n${gregorianInfo}\n\n✨ Больше толкований в Телеграм боте Шепот Морфея: https://t.me/${ctx.botInfo.username}`

      await ctx.reply(gregorianInfo)
      await ctx.reply(
        `🔗 Поделитесь толкованием календарных снов:`,
        Markup.inlineKeyboard([
          [
            Markup.button.url(
              '📤 Поделиться с друзьями',
              `https://t.me/share/url?url=${encodeURIComponent(
                `Толкование календарных снов`
              )}&text=${encodeURIComponent(shareText)}`
            ),
          ],
          [Markup.button.callback('🔙 В меню', 'back_to_menu')],
        ])
      )
    } catch (error) {
      console.error('Ошибка при обработке календарных снов:', error)
      ctx.reply('Произошла ошибка при получении информации о календарных снах.')
    }
  },
}

// Регистрируем все исходящие сообщения бота
bot.use(async (ctx, next) => {
  await next()
  if (ctx.message && ctx.from.id === ctx.botInfo.id) {
    if (!sentMessages.has(ctx.chat.id)) {
      sentMessages.set(ctx.chat.id, [])
    }
    sentMessages.get(ctx.chat.id).push(ctx.message.message_id)
  }
})

Object.entries(commandHandlers).forEach(([command, handler]) => {
  bot.hears(command, handler)
})

// --- Поиск по тексту ---
bot.on('text', async (ctx) => {
  const { text: target, from, message_id } = ctx.message

  if (commandHandlers[target]) return

  if (target.length < 3) {
    ctx.reply('🔍 Слово должно быть длиннее 3 символов.', mainMenu)
    return
  }

  try {
    const dreams = searchItems(data, target)

    if (!dreams.length) {
      ctx.reply('😕 Ничего не найдено. Попробуйте другое слово.', mainMenu)
      return
    }

    const buttons = dreams.map((dream, index) =>
      Markup.button.callback(dream.word, `dream_${message_id}_${index}`)
    )

    searchResults.set(message_id, {
      dreams,
      timestamp: Date.now(),
      userId: ctx.from.id,
    })

    const searchResultMessage = await ctx.reply(
      `🔍 Найдено: ${dreams.length} вариантов`,
      Markup.inlineKeyboard(
        [...buttons, Markup.button.callback('🔙 Назад', 'back_to_menu')],
        { columns: 2 }
      )
    )

    // Сохраняем ID сообщения с результатами поиска
    if (!sentMessages.has(ctx.chat.id)) {
      sentMessages.set(ctx.chat.id, [])
    }
    sentMessages.get(ctx.chat.id).push(searchResultMessage.message_id)

    console.log(
      `first_name: ${from.first_name}, username: ${
        from.username
      }, word: ${target}, amount: ${dreams.length}, date: ${dateFromTimeStamp(
        ctx.message.date
      )}`
    )
  } catch (error) {
    console.error('Ошибка поиска:', error)
  }
})

// --- Обработка выбора сна ---
bot.action(/^dream_(\d+)_(\d+)$/, async (ctx) => {
  const [_, messageId, index] = ctx.match
  const cached = searchResults.get(Number(messageId))

  if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
    await ctx.answerCbQuery('❌ Результаты устарели. Повторите поиск.')
    return
  }

  const dream = cached.dreams[Number(index)]
  if (!dream) return

  const interpretationText = `${dream.description}` // Убрали дублирование названия
  const parts = splitText(interpretationText, 4096)

  // Отправляем все части текста
  for (const part of parts) {
    const sentMessage = await ctx.reply(part)
    if (!sentMessages.has(ctx.chat.id)) {
      sentMessages.set(ctx.chat.id, [])
    }
    sentMessages.get(ctx.chat.id).push(sentMessage.message_id)
  }

  // Формируем текст для шаринга (без дублирования в начале)
  const shareText = `${dream.description.substring(
    0,
    100
  )}...\n\n✨ Больше толкований в Телеграм боте Шепот Морфея: https://t.me/${
    ctx.botInfo.username
  }`

  // Добавляем кнопку "Поделиться"
  const shareMessage = await ctx.reply(
    `🔗 Поделитесь толкованием сна "${dream.word}":`,
    Markup.inlineKeyboard([
      [
        Markup.button.url(
          '📤 Поделиться сном с друзьями',
          `https://t.me/share/url?url=${encodeURIComponent(
            `Толкование сна "${dream.word}"`
          )}&text=${encodeURIComponent(shareText)}`
        ),
      ],
      [Markup.button.callback('🔙 В меню', 'back_to_menu')],
    ])
  )

  // Сохраняем ID сообщения с кнопкой поделиться
  if (!sentMessages.has(ctx.chat.id)) {
    sentMessages.set(ctx.chat.id, [])
  }
  sentMessages.get(ctx.chat.id).push(shareMessage.message_id)

  ctx.answerCbQuery()
})

// --- Возврат в меню ---
bot.action('back_to_menu', async (ctx) => {
  await ctx.deleteMessage()
  ctx.reply('Вы вернулись в меню.', mainMenu)
})

// --- Запуск ---
bot
  .launch()
  .then(() => console.log('Бот запущен'))
  .catch((err) => console.error('Ошибка запуска:', err))

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
