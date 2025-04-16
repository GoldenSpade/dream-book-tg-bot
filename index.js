import { Telegraf, Markup } from 'telegraf'
import 'dotenv/config'
import { User, Activity, initDB } from './data/db.js'
import { safeReply } from './handlers/limiter.js'
import { dataDreams } from './data/dataDreams.js'
import { commandHandlers } from './handlers/commandHandlers.js'
import {
  mainMenu,
  dreamBookMenu,
  fortuneMenu,
  backKeyboard,
} from './helpers/keyboards.js'

import { dateFromTimeStamp } from './helpers/dateFromTimeStamp.js'
import { searchItems } from './helpers/searchItems.js'
import { splitText } from './helpers/splitText.js'
import { getRandomFortune } from './fortune_tellings/yes_no/yesNo.js'
import {
  getRandomMorpheusAudio,
  getMorpheusImage,
} from './fortune_tellings/morpheus_says/morpheusSays.js'
import { getTimeFortune } from './fortune_tellings/time_reading/timeReading.js'
import { getCompassFateVideo } from './fortune_tellings/compass_of_fate/compassOfFate.js'
import { getRandomCosmicFortune } from './fortune_tellings/voice_of_universe/voiceOfOniverse.js'

const bot = new Telegraf(process.env.BOT_API_KEY)
const CACHE_TTL = 60 * 60 * 1000
const searchResults = new Map()
const sentMessages = new Map()

// 🧹 Автоочистка устаревших результатов поиска каждые 5 минут
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of searchResults.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      searchResults.delete(key)
    }
  }
}, 5 * 60 * 1000)

bot.use(async (ctx, next) => {
  if (!ctx.from) return next()
  const [user] = await User.findOrCreate({ userId: ctx.from.id })
  ctx.state.referrerId = user?.referrerId || null
  await next()
})

bot.use(async (ctx, next) => {
  // Если есть пользователь, обновляем его активность
  if (ctx.from) {
    await User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
  }
  await next()
})

await initDB()

bot.command('time', async (ctx) => {
  const fortune = getTimeFortune()
  await safeReply(ctx, () => ctx.reply(fortune))
})

// Start command остается без изменений
bot.start(async (ctx) => {
  try {
    const { id: userId, first_name, username, language_code } = ctx.from
    const chatId = ctx.chat?.id || null

    let cleanPayload = null
    let referrerId = null

    // 1. Извлекаем реф. ID и очищаем buttonData
    if (ctx.startPayload) {
      const match = ctx.startPayload.match(/^(utm_[a-zA-Z0-9]+)_ref_(\d+)$/)

      if (match) {
        cleanPayload = match[1]
        const extractedId = parseInt(match[2])

        if (extractedId && extractedId !== ctx.from.id) {
          referrerId = extractedId
          ctx.state.referrerId = referrerId
        }
      }
    }

    // 2. Создаём или обновляем пользователя (без записи referrerId в Users)
    const [user, created] = await User.findOrCreate({
      userId,
      firstName: first_name,
      userName: username || null,
      chatId,
      language: language_code || null,
    })
    //
    await User.update(userId, {
      firstName: first_name,
      userName: username || null,
      chatId,
      language: language_code || null,
      lastActivity: new Date().toISOString(),
    })

    // 3. Записываем в ButtonActions
    if (cleanPayload) {
      Activity.logButtonAction(
        ctx.from.id,
        'utm_referral_start',
        cleanPayload,
        referrerId
      )
    }

    if (created) {
      console.log(
        `✅ Новый пользователь: ${first_name}, ID: ${userId}, Ref: ${referrerId}`
      )
    } else {
      console.log(`👋 Возвращение пользователя: ${first_name}, ID: ${userId}`)
    }
    await safeReply(ctx, () =>
      ctx.replyWithHTML(
        `🌙 <b>Добро пожаловать в Морфей — бота сновидений и предсказаний!</b>\n\n` +
          `📖 Здесь вы можете:\n` +
          `• Найти <b>толкование снов</b> по ключевым словам\n` +
          `• Узнать <b>лунное</b> и <b>календарное</b> значение сна\n\n` +
          `🔮 А ещё вас ждут:\n` +
          `• Гадания <b>Да/Нет</b>, <b>по времени</b>, <b>по компасу</b>\n` +
          `• <b>Голос Вселенной</b> и <b>мудрость Морфея</b>\n` +
          `• А также редкие <b>восточные гадания</b> с древними образами и смыслами\n\n` +
          `📘 В каждом разделе вы найдёте <b>удобную инструкцию</b> — просто нажмите кнопку «Инструкция», чтобы узнать, как всё работает.\n\n` +
          `✨ Выберите нужный раздел в меню ниже или введите слово из сна, чтобы начать.`,
        mainMenu
      )
    )
  } catch (err) {
    console.error('Ошибка при обработке /start:', err)
    await safeReply(ctx, () =>
      ctx.reply('Произошла ошибка при запуске бота. Попробуйте позже.')
    )
  }
})

// Регистрируем все исходящие сообщения бота
bot.use(async (ctx, next) => {
  await next()
  if (ctx.message && ctx.botInfo && ctx.from.id === ctx.botInfo.id) {
    if (!sentMessages.has(ctx.chat.id)) {
      sentMessages.set(ctx.chat.id, [])
    }
    sentMessages.get(ctx.chat.id).push(ctx.message.message_id)
  }
})

// --- Поиск по тексту ---
bot.action('trigger_search_prompt', async (ctx) => {
  ctx.session.awaitingSearch = true
  await commandHandlers.search_prompt(ctx)
})

bot.on('text', async (ctx) => {
  const { text: target, from, message_id } = ctx.message

  console.log(
    `first_name: ${from.first_name}, userName: ${
      from.username
    }, word: ${target}, date: ${dateFromTimeStamp(ctx.message.date)}`
  )

  if (typeof commandHandlers[target] === 'function') return

  if (target.length < 3) {
    await safeReply(ctx, () =>
      ctx.reply('🔍 Слово должно быть длиннее 3 символов.', mainMenu)
    )
    return
  }

  try {
    const dreams = searchItems(dataDreams, target)

    // Записываем поисковый запрос
    Activity.logSearchQuery(ctx.from.id, target)

    if (!dreams.length) {
      await safeReply(ctx, () =>
        ctx.reply('😕 Ничего не найдено. Попробуйте другое слово.', mainMenu)
      )
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

    const searchResultMessage = await safeReply(ctx, () =>
      ctx.reply(
        `🔍 Найдено: ${dreams.length} вариантов`,
        Markup.inlineKeyboard(
          [
            ...buttons,
            Markup.button.callback('⏪ В главное меню', 'back_to_menu'),
          ],
          { columns: 2 }
        )
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

bot.action(/^dream_(\d+)_(\d+)$/, async (ctx) => {
  const [_, messageId, index] = ctx.match
  const cached = searchResults.get(Number(messageId))

  if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
    await ctx.answerCbQuery('❌ Результаты устарели. Повторите поиск.')
    return
  }

  const dream = cached.dreams[Number(index)]
  if (!dream) return

  const interpretationText = `${dream.description}` // Трактование сна
  const parts = splitText(interpretationText, 4096) // Разбиение на части

  // Формируем текст для шаринга (без названия сна и без текста "Толкование сна")
  const shareText = `${dream.description.substring(
    0,
    100
  )}...\n\n✨ Больше толкований в Телеграм боте Морфей: https://t.me/MorfejBot?start=utm_dream_ref_${
    ctx.from.id
  }`

  // Если трактование помещается в одно сообщение
  if (parts.length === 1) {
    const sentMessage = await safeReply(ctx, () =>
      ctx.replyWithHTML(
        `${interpretationText}`, // Отправляем только трактование без названия сна
        Markup.inlineKeyboard([
          [
            Markup.button.url(
              '🦉 Поделиться сном с друзьями',
              `https://t.me/share/url?url=${encodeURIComponent(
                ''
              )} &text=${encodeURIComponent(shareText)}`
            ),
          ],
          [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
        ])
      )
    )
    // Сохраняем ID отправленного сообщения
    if (!sentMessages.has(ctx.chat.id)) {
      sentMessages.set(ctx.chat.id, [])
    }
    sentMessages.get(ctx.chat.id).push(sentMessage.message_id)
  } else {
    // Если трактование длинное и нужно разделить на части
    for (const part of parts) {
      const sentMessage = await safeReply(ctx, () =>
        ctx.replyWithHTML(
          `${part}`, // Отправляем трактование без названия сна
          Markup.inlineKeyboard([
            [
              Markup.button.url(
                '🦉 Поделиться сном с друзьями',
                `https://t.me/share/url?url=${encodeURIComponent(
                  ''
                )} &text=${encodeURIComponent(shareText)}`
              ),
            ],
            [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
          ])
        )
      )
      // Сохраняем ID отправленного сообщения
      if (!sentMessages.has(ctx.chat.id)) {
        sentMessages.set(ctx.chat.id, [])
      }
      sentMessages.get(ctx.chat.id).push(sentMessage.message_id)
    }
  }

  // Добавляем в БД запись о найденном сне
  Activity.logButtonAction(
    ctx.from.id,
    'share_action',
    `😴 Сон: ${dream.word}`,
    ctx.state.referrerId
  )

  ctx.answerCbQuery()
})

// Переходы между меню
// --- Возврат в главное меню ---
bot.action('back_to_menu', async (ctx) => {
  try {
    await ctx.deleteMessage()
    await safeReply(ctx, () =>
      ctx.replyWithHTML('✨ <b>༺ Главное меню ༺</b> ✨', mainMenu)
    )
  } catch (error) {
    console.error('Ошибка возврата:', error)
    await safeReply(ctx, () =>
      ctx.replyWithHTML('✨ <b>༺ Главное меню ༺</b> ✨', mainMenu)
    )
  }
})
// Возврат в Сонник
bot.action('back_to_dreams', async (ctx) => {
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.dream_menu(ctx)
})
// Возврат в Гадания
bot.action('back_to_fortune', async (ctx) => {
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.fortune_menu(ctx)
})

// ⏬ Переходы между разделами
bot.action('menu_dreambook', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.dream_menu(ctx)
})

bot.action('menu_fortune', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.fortune_menu(ctx)
})

bot.action('menu_instruction', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.general_instruction(ctx)
})

// ⏬ Меню Сонника
bot.action('dream_search', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.dream_search(ctx)
})

bot.action('dream_lunar', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.dream_lunar(ctx)
})

bot.action('dream_calendar', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.dream_calendar(ctx)
})

bot.action('dream_instruction', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.dream_instruction(ctx)
})

// ⏬ Меню Гаданий
bot.action('fortune_yesno', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.fortune_yesno(ctx)
})

bot.action('fortune_morpheus', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.fortune_morpheus(ctx)
})

bot.action('fortune_time', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.fortune_time(ctx)
})

bot.action('fortune_compass', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.fortune_compass(ctx)
})

bot.action('fortune_voice', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.fortune_voice(ctx)
})

bot.action('fortune_instruction', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})
  await commandHandlers.fortune_instruction(ctx)
})

// Конец обработчиков меню

// Обработка начала гадания
bot.action('start_fortune', async (ctx) => {
  Activity.logButtonAction(
    ctx.from.id,
    'fortune_action',
    '✨ Гадание Да/Нет (запуск)',
    ctx.state.referrerId
  )
  try {
    // Удаляем предыдущее сообщение с инструкцией
    await ctx.deleteMessage()

    // Получаем случайное гадание
    const gifBuffer = await getRandomFortune()
    const shareText = `🕯️ Я погадал(а) в боте \"Морфей\"!\n\n✨ Попробуй и ты: https://t.me/MorfejBot?start=utm_yesno_ref_${ctx.from.id}`

    // Отправляем результат гадания
    await safeReply(ctx, () =>
      ctx.replyWithVideo(
        { source: gifBuffer },
        {
          caption: '🔮 Ваш ответ... 🎬 Нажмите на видео',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.url(
                  '✨ Поделиться гаданием Да/Нет',
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
    )
  } catch (error) {
    console.error('Ошибка при гадании:', error)
    await safeReply(ctx, () =>
      ctx.reply('Что-то пошло не так, попробуйте ещё раз позже.', mainMenu)
    )
  }
})

// Гадание Морфеей говорит
bot.action('start_morpheus', async (ctx) => {
  Activity.logButtonAction(
    ctx.from.id,
    'fortune_action',
    '🎧 Морфей говорит (Запуск)',
    ctx.state.referrerId
  )
  try {
    await ctx.deleteMessage()

    // Получаем только изображение (аудио будем получать при нажатии кнопки)
    const { path: imagePath, filename: imageFilename } =
      await getMorpheusImage()

    // Отправляем изображение с кнопкой
    await safeReply(ctx, () =>
      ctx.replyWithPhoto(
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
    )
  } catch (error) {
    console.error('Ошибка в Морфей говорит:', error)
    await safeReply(ctx, () =>
      ctx.reply(
        '⚠️ Не удалось загрузить сообщение Морфея. Пожалуйста, попробуйте позже.',
        mainMenu
      )
    )
  }
})

// Обработчик для кнопки "Слушать послание"
bot.action('play_morpheus_audio', async (ctx) => {
  Activity.logButtonAction(
    ctx.from.id,
    'fortune_action',
    '🎧 Морфей говорит (Запуск аудио)',
    ctx.state.referrerId
  )
  try {
    await ctx.deleteMessage() // Удаляем сообщение с кнопкой

    // Получаем СЛУЧАЙНОЕ аудио каждый раз при нажатии
    const { path: audioPath, filename: audioFilename } =
      await getRandomMorpheusAudio()
    const shareText = `🎵 Я услышал(а) голос Морфея в боте \"Морфей\"!\n✨ Попробуй и ты: https://t.me/MorfejBot?start=utm_morpheus_ref_${ctx.from.id}`

    // Отправляем аудио
    await safeReply(ctx, () =>
      ctx.replyWithAudio(
        { source: audioPath, filename: audioFilename },
        {
          caption: '🕯 Морфей говорит...',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.url(
                  '🎵 Поделиться гаданием Морфей говорит',
                  `https://t.me/share/url?url=${encodeURIComponent(
                    `▶ Голос Морфея 🔊\n`
                  )}&text=${encodeURIComponent(shareText)}`
                ),
              ],
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    )
  } catch (error) {
    console.error('Ошибка при воспроизведении аудио:', error)
    await safeReply(ctx, () =>
      ctx.reply('⚠️ Не удалось воспроизвести сообщение Морфея.', mainMenu)
    )
  }
})

// Запуск Гадание времени
bot.action('start_time_fortune', async (ctx) => {
  Activity.logButtonAction(
    ctx.from.id,
    'fortune_action',
    '⏰ Гадание времени (запуск)',
    ctx.state.referrerId
  )
  try {
    await ctx.deleteMessage()
    const result = getTimeFortune()

    const shareText = `${result}\n✨ Попробуй и ты: https://t.me/MorfejBot?start=utm_time_ref_${ctx.from.id}`

    await safeReply(ctx, () =>
      ctx.replyWithVideo(
        { source: './fortune_tellings/time_reading/video/time_reading.mp4' }, // добавь подходящее изображение
        {
          caption: result,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.url(
                  '⏰ Поделиться гаданием времени',
                  `https://t.me/share/url?url=${encodeURIComponent(
                    `⚜ Гадание времени ⚜\n`
                  )}&text=${encodeURIComponent(shareText)}`
                ),
              ],
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    )
  } catch (error) {
    console.error('Ошибка при гадании:', error)
    await safeReply(ctx, () =>
      ctx.reply('Что-то пошло не так, попробуйте ещё раз позже.', mainMenu)
    )
  }
})
// Компас судьбы
bot.action('start_compass_fate', async (ctx) => {
  Activity.logButtonAction(
    ctx.from.id,
    'fortune_action',
    '🧭 Компас судьбы (запуск)',
    ctx.state.referrerId
  )
  try {
    await ctx.deleteMessage()
    const { path } = getCompassFateVideo()

    const shareText = `🧭 Я использовал(а) Компас Судьбы в боте \"Морфей\".\n✨ Попробуй и ты: https://t.me/MorfejBot?start=utm_compass_ref_${ctx.from.id}`

    await safeReply(ctx, () =>
      ctx.replyWithVideo(
        { source: path },
        {
          caption: '🕯 Судьба выбрала для тебя направление...',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.url(
                  '🧭 Поделиться Компасом Судьбы',
                  `https://t.me/share/url?url=${encodeURIComponent(
                    `❇ Компас судьбы ✴\n`
                  )}&text=${encodeURIComponent(shareText)}`
                ),
              ],
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    )
  } catch (error) {
    console.error('Ошибка в Компас судьбы (видео):', error)
    await safeReply(ctx, () =>
      ctx.reply(
        '⚠️ Видео не удалось отправить. Проверьте наличие файлов.',
        mainMenu
      )
    )
  }
})

bot.action('start_voice_of_universe', async (ctx) => {
  Activity.logButtonAction(
    ctx.from.id,
    'fortune_action',
    '🪐 Голос Вселенной (запуск)',
    ctx.state.referrerId
  )

  try {
    await ctx.deleteMessage()
    const { path, message, name } = getRandomCosmicFortune()
    const interpretationText = `Вселенная дала знак "${name}":\n\n✨${message}`
    const shareText = `🪐 Я услышал(а) голос Вселенной в боте "Морфей"!\n✨ Попробуй и ты: https://t.me/MorfejBot?start=utm_voice_ref_${ctx.from.id}`

    await safeReply(ctx, () =>
      ctx.replyWithVideo(
        { source: path },
        {
          caption: `🦋🌀 ${interpretationText}`,
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.url(
                  '🪐 Поделиться голосом Вселенной',
                  `https://t.me/share/url?url=${encodeURIComponent(
                    `💫 Голос Вселенной\n`
                  )}&text=${encodeURIComponent(shareText)}`
                ),
              ],
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    )
  } catch (error) {
    console.error('Ошибка при гадании Голос Вселенной:', error)
    await safeReply(ctx, () =>
      ctx.reply('⚠️ Не удалось получить послание. Попробуйте позже.', mainMenu)
    )
  }
})

// --- Запуск ---
bot
  .launch()
  .then(() => console.log('Бот запущен'))
  .catch((err) => console.error('Ошибка запуска:', err))

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
