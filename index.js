import { Telegraf, Markup } from 'telegraf'
import 'dotenv/config'
import { User, Activity, initDB } from './data/db.js'
import { data } from './data/data.js'
import { commandHandlers } from './handlers/commandHandlers.js'
import { mainMenu } from './helpers/keyboards.js'
import { dateFromTimeStamp } from './helpers/dateFromTimeStamp.js'
import { searchItems } from './helpers/searchItems.js'
import { splitText } from './helpers/splitText.js'
import { getRandomFortune } from './fortune_tellings/yes_no/yesNo.js'
import {
  getRandomMorpheusAudio,
  getMorpheusImage,
} from './fortune_tellings/morpheus_says/morpheusSays.js'

const bot = new Telegraf(process.env.BOT_API_KEY)
const CACHE_TTL = 60 * 60 * 1000
const searchResults = new Map()
const sentMessages = new Map()

await initDB()

// Start command остается без изменений
bot.start(async (ctx) => {
  console.log(`${ctx.message.from.id}`)
  try {
    const { id, first_name, username } = ctx.from

    // Новый формат вызова
    const [user, created] = await User.findOrCreate({
      userId: id,
      firstName: first_name,
      username: username || null,
    })

    // Остальной код остается без изменений
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
      await User.update(id, { lastActivity: new Date().toISOString() })
    }

    ctx.reply(
      'Привет! Введите слово для поиска трактования сна или выберите опцию из меню.',
      mainMenu
    )
  } catch (err) {
    console.error('Ошибка при обработке /start:', err)
    ctx.reply(
      'Произошла ошибка при запуске бота. Пожалуйста, попробуйте позже.'
    )
  }
})

Object.entries(commandHandlers).forEach(([command, handler]) => {
  bot.hears(command, handler)
})

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

// --- Поиск по тексту ---
bot.on('text', async (ctx) => {
  const { text: target, from, message_id } = ctx.message

  console.log(
    `first_name: ${from.first_name}, username: ${
      from.username
    }, word: ${target}, date: ${dateFromTimeStamp(ctx.message.date)}`
  )

  if (commandHandlers[target]) return

  if (target.length < 3) {
    ctx.reply('🔍 Слово должно быть длиннее 3 символов.', mainMenu)
    return
  }

  try {
    const dreams = searchItems(data, target)

    // Записываем поисковый запрос
    Activity.logSearchQuery(ctx.from.id, target)

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
        [
          ...buttons,
          Markup.button.callback('⏪ В главное меню', 'back_to_menu'),
        ],
        { columns: 2 }
      )
    )

    // Сохраняем ID сообщения с результатами поиска
    if (!sentMessages.has(ctx.chat.id)) {
      sentMessages.set(ctx.chat.id, [])
    }
    sentMessages.get(ctx.chat.id).push(searchResultMessage.message_id)
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
  )}...\n\n✨ Больше толкований в Телеграм боте Морфей: https://t.me/${
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
      [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
    ])
  )

  // Добавляем в БД запись (текст кнопки найденного сна)
  Activity.logButtonAction(
    ctx.from.id,
    'share_action',
    `Шеринг толкованием: ${dream.word}`
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
  try {
    await ctx.deleteMessage()
    await ctx.reply('Главное меню:', mainMenu)
  } catch (error) {
    console.error('Ошибка возврата:', error)
    await ctx.reply('Главное меню:', mainMenu)
  }
})

// Обработка начала гадания
bot.action('start_fortune', async (ctx) => {
  Activity.logButtonAction(ctx.from.id, 'fortune_action', '✨ Гадание Да/Нет')
  try {
    // Удаляем предыдущее сообщение с инструкцией
    await ctx.deleteMessage()

    // Получаем случайное гадание
    const gifBuffer = await getRandomFortune()
    const shareText = `🕯️ Я погадал(а) в боте "Морфей"!\n\n✨ Попробуй и ты: https://t.me/${ctx.botInfo.username}`

    // Отправляем результат гадания
    await ctx.replyWithVideo(
      { source: gifBuffer },
      {
        caption: '🔮 Ваш ответ...',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.url(
                '🕯️ Поделиться гаданием',
                `https://t.me/share/url?url=${encodeURIComponent(
                  ' '
                )}&text=${encodeURIComponent(shareText)}`
              ),
            ],
            [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
          ],
        },
      }
    )
    // Добавляем запись о кнопке шаринга
    Activity.logButtonAction(
      ctx.from.id,
      'share_action',
      '📤 Поделиться гаданием Да/Нет'
    )
  } catch (error) {
    console.error('Ошибка при гадании:', error)
    await ctx.reply('Что-то пошло не так, попробуйте ещё раз позже.', mainMenu)
  }
})

// Гадание Морфеей говорит
bot.action('start_morpheus', async (ctx) => {
  Activity.logButtonAction(
    ctx.from.id,
    'fortune_action',
    '🎧 Морфей говорит (Получить послание)'
  )
  try {
    await ctx.deleteMessage()

    // Получаем только изображение (аудио будем получать при нажатии кнопки)
    const { path: imagePath, filename: imageFilename } =
      await getMorpheusImage()

    // Отправляем изображение с кнопкой
    await ctx.replyWithPhoto(
      { source: imagePath, filename: imageFilename },
      {
        caption: '🕯 Морфей приготовил для вас послание...',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '🎧 Слушать послание',
                'play_morpheus_audio'
              ),
            ],
          ],
        },
      }
    )
  } catch (error) {
    console.error('Ошибка в Морфей говорит:', error)
    await ctx.reply(
      '⚠️ Не удалось загрузить сообщение Морфея. Пожалуйста, попробуйте позже.',
      mainMenu
    )
  }
})

// Обработчик для кнопки "Слушать послание"
bot.action('play_morpheus_audio', async (ctx) => {
  Activity.logButtonAction(
    ctx.from.id,
    'fortune_action',
    'Запуск аудио (Морфей Говорит)'
  )
  try {
    await ctx.deleteMessage() // Удаляем сообщение с кнопкой

    // Получаем СЛУЧАЙНОЕ аудио каждый раз при нажатии
    const { path: audioPath, filename: audioFilename } =
      await getRandomMorpheusAudio()
    const shareText = `🌌 Я услышал(а) голос Морфея в боте "Морфей"!\n\n✨ Попробуй и ты: https://t.me/${ctx.botInfo.username}`

    // Отправляем аудио
    await ctx.replyWithAudio(
      { source: audioPath, filename: audioFilename },
      {
        caption: '🕯 Морфей говорит...',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.url(
                '📤 Поделиться',
                `https://t.me/share/url?url=${encodeURIComponent(
                  'Голос Морфея'
                )}&text=${encodeURIComponent(shareText)}`
              ),
            ],
            [Markup.button.callback('🔄 Новое послание', 'start_morpheus')],
            [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
          ],
        },
      }
    )
    // Добавляем запись о кнопке шаринга
    Activity.logButtonAction(
      ctx.from.id,
      'share_action',
      '📤 Поделиться посланием (Морфей говорит)'
    )
  } catch (error) {
    console.error('Ошибка при воспроизведении аудио:', error)
    await ctx.reply('⚠️ Не удалось воспроизвести сообщение Морфея.', mainMenu)
  }
})

// --- Запуск ---
bot
  .launch()
  .then(() => console.log('Бот запущен'))
  .catch((err) => console.error('Ошибка запуска:', err))

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
