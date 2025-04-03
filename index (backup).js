import { Telegraf, Markup } from 'telegraf'
import 'dotenv/config.js'

import { data } from './data/data.js'
import { splitText } from './helpers/splitText.js'
import { searchItems } from './helpers/searchItems.js'
import { dateFromTimeStamp } from './helpers/dateFromTimeStamp.js'

const bot = new Telegraf(process.env.API_KEY)

const searchResults = new Map()

// Главное меню
const mainMenu = Markup.keyboard([
  ['🔍 Поиск по слову', 'ℹ️ О боте', '❓ Помощь'],
  ['☕ Купить нам кофе'],
]).resize()

bot.start((ctx) => {
  ctx.reply(
    'Привет! Введите слово для поиска трактования сна или выберите опцию из меню.',
    mainMenu
  )
})

// Обработка команды "Поиск по слову"
bot.hears('🔍 Поиск по слову', (ctx) => {
  ctx.reply('Введите слово для поиска трактования сна:')
  // ctx.reply()
})

// Обработка команды "О боте"
bot.hears('ℹ️ О боте', (ctx) => {
  ctx.reply(
    '🔮 Сонник с глубоким анализом. Напишите, что вам приснилось — и я расшифрую скрытые смыслы!  '
  )
})

// Обработка команды "Помощь"
bot.hears('❓ Помощь', (ctx) => {
  ctx.reply(
    'Для поиска трактования сна введите слово длиной более 3-х символов. Используйте букву "е" вместо "ё". Вы можете также попробовать написать слово во множественном числе.'
  )
})

// Обработка команды "Купить нам кофе"
bot.hears('☕ Купить нам кофе', (ctx) => {
  ctx.replyWithHTML(
    'Вы можете поддержать нас, купив нам кофе <a href="https://google.com">здесь</a>.'
  )
})

bot.on('text', async (ctx) => {
  const target = ctx.message.text
  // Проверка на команду
  if (
    [
      '🔍 Поиск по слову',
      'ℹ️ О боте',
      '❓ Помощь',
      '☕ Купить нам кофе',
    ].includes(target)
  )
    return

  if (target.length >= 3) {
    const dreams = searchItems(data, target)
    if (Array.isArray(dreams) && dreams.length > 0) {
      const buttons = dreams.map((el, index) =>
        Markup.button.callback(
          el.word,
          `dream_${ctx.message.message_id}_${index}`
        )
      )
      await ctx.reply(
        `Найдено вариантов ${dreams.length}:`,
        Markup.inlineKeyboard(
          [
            ...buttons,
            Markup.button.callback('🔙 Вернуться в меню', 'back_to_menu'),
          ],
          { columns: 2 }
        )
      )
      searchResults.set(ctx.message.message_id, dreams)
      console.log(
        `first_name: ${ctx.message.from.first_name}, username: ${
          ctx.message.from.username
        }, word: ${target}, amount: ${dreams.length}, date: ${dateFromTimeStamp(
          ctx.message.date
        )}`
      )
    } else {
      ctx.reply(
        `Слово не найдено. Попробуйте описать другим словом. Вместо буквы "ё" используйте букву "е". Можете попробовать написать во множественном числе.`,
        mainMenu
      )
      console.log(
        `userName: ${ctx.message.from.username}, word: ${target}. Слово не найдено. Попробуйте описать другим словом.`
      )
    }
  } else {
    ctx.reply(`Слово должно быть больше 3-х символов.`, mainMenu)
    console.log(
      `userName: ${ctx.message.from.username}, word: ${target}. Слово должно быть больше 3-х символов.`
    )
  }
})

bot.action(/dream_(\d+)_(\d+)/, async (ctx) => {
  const messageId = parseInt(ctx.match[1])
  const index = parseInt(ctx.match[2])
  const dreams = searchResults.get(messageId)
  if (dreams && dreams[index]) {
    const dream = dreams[index]
    const parts = splitText(`${dream.word} \n\n ${dream.description}`, 4096) // Максимальная длина сообщения в Telegram
    for (const part of parts) {
      await ctx.reply(part)
    }
  }
  await ctx.answerCbQuery() // Подтвердите запроса обратного вызова
})

// Обработка команды "Вернуться в меню"
bot.action('back_to_menu', (ctx) => {
  ctx.reply('Вы вернулись в главное меню.', mainMenu)
  ctx.answerCbQuery() // Подтвердите запроса обратного вызова
})

bot.launch().then(() => console.log('Started'))

process.once('SIGINT', () => bot.stop('SIGNIN'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
