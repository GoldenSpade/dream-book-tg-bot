import { Telegraf, Markup } from 'telegraf'
import 'dotenv/config'
import { User, Activity, initDB, db } from './data/db.js'
import { checkAccess, decrementAccess } from './payments/accessControl.js'

import { scheduleDailyLimitGranting } from './helpers/dailyLimitGrant.js'

import { safeReply, safeSend } from './handlers/limiter.js'
import { dataDreams } from './data/dataDreams.js'
import { commandHandlers } from './handlers/commandHandlers.js'
import { mainMenu, mainMenuWithBack } from './helpers/keyboards.js'

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

  const user = db
    .prepare('SELECT * FROM Users WHERE userId = ?')
    .get(ctx.from.id)
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
    // Проверяем вручную, есть ли пользователь в таблице
    const existing = db
      .prepare('SELECT * FROM Users WHERE userId = ?')
      .get(userId)
    const created = !existing

    // Создаём (если нужно)
    const [user] = await User.findOrCreate({
      userId,
      firstName: first_name,
      userName: username || null,
      chatId,
      language: language_code || null,
    })

    // Начисление стартовых лимитов
    // Если пользователь только что создан — даём 5 лимитов
    if (created) {
      db.prepare(
        `UPDATE Users SET "limit" = COALESCE("limit", 0) + 5 WHERE userId = ?`
      ).run(userId)

      try {
        await safeReply(ctx, () =>
          ctx.replyWithHTML(
            '🎁 Вам начислено <b>5 ежедневных лимитов</b> для гаданий!',
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '✖ Убрать сообщение',
                      callback_data: 'dismiss_ref_notify',
                    },
                  ],
                ],
              },
            }
          )
        )
      } catch (e) {
        console.warn(
          '❗ Не удалось отправить сообщение о бонусе новичку:',
          e.message
        )
      }
    }

    await User.update(userId, {
      firstName: first_name,
      userName: username || null,
      chatId,
      language: language_code || null,
      lastActivity: new Date().toISOString(),
    })

    // 3.1 Начисляем бонусы за реферала
    if (created && referrerId) {
      try {
        // Увеличиваем счётчики у пригласившего
        const refUser = db
          .prepare('SELECT * FROM Users WHERE userId = ?')
          .get(referrerId)

        if (refUser) {
          db.prepare(
            `UPDATE Users 
         SET refCount = COALESCE(refCount, 0) + 1,
             refBonus = COALESCE(refBonus, 0) + 2
         WHERE userId = ?`
          ).run(referrerId)
        }

        // Даём бонус новому пользователю
        db.prepare(
          `UPDATE Users 
       SET refBonus = COALESCE(refBonus, 0) + 2 
       WHERE userId = ?`
        ).run(userId)

        console.log(
          `🎁 Начислены бонусы: пригласившему ${referrerId}, новому ${userId}`
        )
        // Уведомление пригласившему
        try {
          await safeSend(referrerId, () =>
            bot.telegram.sendMessage(
              referrerId,
              `🎉 По вашей реферальной ссылке присоединился новый пользователь!\n\n🎁 Вам начислено <b>+2 бонуса</b>.`,
              {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: '✖ Убрать сообщение',
                        callback_data: 'dismiss_ref_notify',
                      },
                    ],
                  ],
                },
              }
            )
          )
        } catch (e) {
          console.warn(
            '⚠️ Не удалось отправить сообщение пригласившему:',
            e.message
          )
        }

        // Уведомление приглашённому
        try {
          await safeReply(ctx, () =>
            ctx.replyWithHTML(
              `🎁 Вам начислено <b>+2 бонуса</b> за переход по реферальной ссылке!\nСпасибо, что присоединились 🙌`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: '✖ Убрать сообщение',
                        callback_data: 'dismiss_ref_notify',
                      },
                    ],
                  ],
                },
              }
            )
          )
        } catch (e) {
          console.warn(
            '⚠️ Не удалось отправить сообщение новому пользователю:',
            e.message
          )
        }
      } catch (err) {
        console.error('Ошибка начисления бонусов за реферала:', err)
      }
    }

    // 3. Записываем в ButtonActions
    if (cleanPayload) {
      Activity.logButtonAction(
        ctx.from.id,
        'utm_referral_start',
        cleanPayload,
        referrerId
      )
    } else {
      Activity.logButtonAction(
        ctx.from.id,
        'command',
        '/start',
        ctx.state.referrerId || null
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
        `🌙 <b>Добро пожаловать в Морфей! 🤖 Бот сновидений и предсказаний!</b>\n\n` +
          `📖 Здесь вы можете:\n\n` +
          `⚜Найти <b>толкование снов</b> по ключевым словам\n` +
          `⚜ Узнать <b>значение сна</b> в зависимости от <b>лунного</b> и <b>календарного</b> дня\n\n` +
          `🕯 А ещё вас ждут гадания:\n\n` +
          `🔮 Гадание Да/Нет\n` +
          `🎧 Морфей говорит\n` +
          `🕰 Гадание времени\n` +
          `🧭 Компас судьбы\n` +
          `🪐 Голос Вселенной\n\n` +
          `📘 В каждом разделе вы найдёте <b>удобную инструкцию</b> — просто нажмите кнопку «Инструкция» внутри раздела сонника или гаданий, чтобы узнать, как всё работает.\n\n` +
          `📋 В главном меню находится меню 👤 Мой аккаунт. Там отображаются ваши 📊 лимиты гаданий и 🎁 бонусы .\n\n` +
          `✨ Выберите нужный раздел в меню ниже или введите слово из сна, чтобы начать.`,
        mainMenuWithBack
      )
    )
  } catch (err) {
    console.error('Ошибка при обработке /start:', err)
    await safeReply(ctx, () =>
      ctx.reply('⚠️ Произошла ошибка при запуске бота. Попробуйте позже.')
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
    await ctx.answerCbQuery('✖ Результаты устарели. Повторите поиск.')
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

// Обработка кнопок меню
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

//  Обработка кнопки Мой аккаунт
bot.action('menu_account', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.deleteMessage().catch(() => {})

  Activity.logButtonAction(
    ctx.from.id,
    'menu_button',
    '👤 Мой аккаунт',
    ctx.state.referrerId
  )

  try {
    const user = db
      .prepare('SELECT * FROM Users WHERE userId = ?')
      .get(ctx.from.id)

    let message = `<b>👤 Ваш аккаунт</b>\n\n`

    // Лимиты. Суммарное количество доступных гаданий
    const totalFortunes = (user.refBonus || 0) + (user.limit || 0)
    message += `🔢 Доступно гаданий: <b>${totalFortunes}</b>\n`

    // Премиум
    if (user.premiumSince) {
      const now = new Date()
      const premiumUntil = new Date(user.premiumSince)
      const diffMs = premiumUntil - now

      if (diffMs > 0) {
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24)
        const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60)
        const diffSeconds = Math.floor((diffMs / 1000) % 60)

        // message += `💎 Премиум действует ещё: <b>${diffDays} дн. ${diffHours} ч. ${diffMinutes} мин. ${diffSeconds} сек.</b>\n`
      } else {
        // message += `💎 Премиум: <b>истёк</b>\n`
      }
    } else {
      // message += `💎 Премиум: <b>отсутствует</b>\n`
    }

    // Партнёрская программа
    message += `🤝 Приглашено друзей: <b>${user.refCount || 0}</b>\n`
    message += `🎁 Бонусов за рефералов: <b>${user.refBonus || 0}</b>\n`

    message += `\n✨ Спасибо, что вы с нами!`

    await safeReply(ctx, () =>
      ctx.replyWithHTML(
        message,
        Markup.inlineKeyboard([
          [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
        ])
      )
    )
  } catch (error) {
    console.error('Ошибка в menu_account:', error)
    await safeReply(ctx, () =>
      ctx.reply('⚠️ Не удалось получить информацию об аккаунте.')
    )
  }
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

bot.action('dismiss_ref_notify', async (ctx) => {
  try {
    await ctx.answerCbQuery()
    await ctx.deleteMessage()
  } catch (e) {
    console.warn('✖ Не удалось удалить сообщение о реферале:', e.message)
  }
})
// Конец обработчиков меню

// Обработка начала гадания Да/Нет
bot.action('start_fortune', async (ctx) => {
  await ctx.answerCbQuery()
  const access = checkAccess(ctx)
  if (!access.granted) {
    try {
      await ctx.deleteMessage()
    } catch (e) {
      console.warn('❗ Не удалось удалить сообщение с кнопкой "Начать"')
    }

    return safeReply(ctx, () =>
      ctx.replyWithPhoto(
        { source: './fortune_tellings/img/no_access.jpg' },
        {
          caption:
            '🚫 <b>Нет доступа к гаданию.</b>\n\n' +
            '🌙 <b>Лимиты пополняются каждую ночь</b>,\n' +
            'но <u>только если у вас осталось 0 лимитов и 0 реферальных бонусов</u>.\n\n' +
            '📉 Если у вас есть хотя бы 1 лимит или бонус —\n' +
            'зачисление <b>не произойдёт</b> до полного обнуления.',
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    )
  }

  Activity.logButtonAction(
    ctx.from.id,
    'fortune_action',
    '✨ Гадание Да/Нет (запуск)',
    ctx.state.referrerId
  )

  try {
    await ctx.deleteMessage()

    const gifBuffer = await getRandomFortune()
    const shareText = `🕯️ Я погадал(а) в боте «Морфей»! Попробуй и ты:\nhttps://t.me/MorfejBot?start=utm_yesno_ref_${ctx.from.id}`

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
                    '🔮 Гадание Да/Нет\n'
                  )}&text=${encodeURIComponent(shareText)}`
                ),
              ],
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    )

    // ✅ Уменьшаем лимит только после отправки
    if (!access.premium) {
      decrementAccess(ctx)
    }
  } catch (error) {
    console.error('Ошибка при гадании:', error)
    await safeReply(ctx, () =>
      ctx.reply('⚠️ Что-то пошло не так. Попробуйте позже.', mainMenu)
    )
  }
})

// Гадание Морфеей говорит
bot.action('start_morpheus', async (ctx) => {
  await ctx.answerCbQuery()

  const access = await checkAccess(ctx)
  if (!access.granted) {
    try {
      await ctx.deleteMessage()
    } catch (e) {
      console.warn('❗ Не удалось удалить сообщение Морфей говорит')
    }

    return safeReply(ctx, () =>
      ctx.replyWithPhoto(
        { source: './fortune_tellings/img/no_access.jpg' },
        {
          caption:
            '🚫 <b>Нет доступа к гаданию.</b>\n\n' +
            '🌙 <b>Лимиты пополняются каждую ночь</b>,\n' +
            'но <u>только если у вас осталось 0 лимитов и 0 реферальных бонусов</u>.\n\n' +
            '📉 Если у вас есть хотя бы 1 лимит или бонус —\n' +
            'зачисление <b>не произойдёт</b> до полного обнуления.',
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    )
  }

  Activity.logButtonAction(
    ctx.from.id,
    'fortune_action',
    '🎧 Морфей говорит (Запуск)',
    ctx.state.referrerId
  )

  try {
    await ctx.deleteMessage()

    const { path: imagePath, filename: imageFilename } =
      await getMorpheusImage()
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
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
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
    // ✅ Уменьшаем лимит после отправки
    const access = await checkAccess(ctx)
    if (!access.premium) {
      decrementAccess(ctx)
    }
  } catch (error) {
    console.error('Ошибка при воспроизведении аудио:', error)
    await safeReply(ctx, () =>
      ctx.reply('⚠️ Не удалось воспроизвести сообщение Морфея.', mainMenu)
    )
  }
})

// Запуск Гадание времени
bot.action('start_time_fortune', async (ctx) => {
  await ctx.answerCbQuery()

  const access = await checkAccess(ctx)
  if (!access.granted) {
    try {
      await ctx.deleteMessage()
    } catch (e) {
      console.warn('❗ Не удалось удалить сообщение с кнопкой "Начать"')
    }

    return safeReply(ctx, () =>
      ctx.replyWithPhoto(
        { source: './fortune_tellings/img/no_access.jpg' },
        {
          caption:
            '🚫 <b>Нет доступа к гаданию.</b>\n\n' +
            '🌙 <b>Лимиты пополняются каждую ночь</b>,\n' +
            'но <u>только если у вас осталось 0 лимитов и 0 реферальных бонусов</u>.\n\n' +
            '📉 Если у вас есть хотя бы 1 лимит или бонус —\n' +
            'зачисление <b>не произойдёт</b> до полного обнуления.',
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    )
  }

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
        { source: './fortune_tellings/time_reading/video/time_reading.mp4' },
        {
          caption: result,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.url(
                  '⏰ Поделиться гаданием времени',
                  `https://t.me/share/url?url=${encodeURIComponent(
                    '⏳ Гадание времени\n'
                  )}&text=${encodeURIComponent(shareText)}`
                ),
              ],
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    )

    // ✅ Уменьшаем лимит после успешного ответа
    if (!access.premium) {
      decrementAccess(ctx)
    }
  } catch (error) {
    console.error('Ошибка при гадании времени:', error)
    await safeReply(ctx, () =>
      ctx.reply('⚠️ Что-то пошло не так. Попробуйте ещё раз позже.', mainMenu)
    )
  }
})

// Компас судьбы
bot.action('start_compass_fate', async (ctx) => {
  await ctx.answerCbQuery()

  const access = await checkAccess(ctx)
  if (!access.granted) {
    try {
      await ctx.deleteMessage()
    } catch (e) {
      console.warn('❗ Не удалось удалить сообщение Компас судьбы')
    }

    return safeReply(ctx, () =>
      ctx.replyWithPhoto(
        { source: './fortune_tellings/img/no_access.jpg' },
        {
          caption:
            '🚫 <b>Нет доступа к гаданию.</b>\n\n' +
            '🌙 <b>Лимиты пополняются каждую ночь</b>,\n' +
            'но <u>только если у вас осталось 0 лимитов и 0 реферальных бонусов</u>.\n\n' +
            '📉 Если у вас есть хотя бы 1 лимит или бонус —\n' +
            'зачисление <b>не произойдёт</b> до полного обнуления.',
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    )
  }

  Activity.logButtonAction(
    ctx.from.id,
    'fortune_action',
    '🧭 Компас судьбы (запуск)',
    ctx.state.referrerId
  )

  try {
    await ctx.deleteMessage()
    const { path } = getCompassFateVideo()

    const shareText = `💫 Я использовал(а) Компас Судьбы в боте «Морфей».\n✨ Попробуй и ты: https://t.me/MorfejBot?start=utm_compass_ref_${ctx.from.id}`

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
                    '🧭 Компас Судьбы\n'
                  )}&text=${encodeURIComponent(shareText)}`
                ),
              ],
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    )

    // ✅ Уменьшаем лимит только после отправки
    if (!access.premium) {
      decrementAccess(ctx)
    }
  } catch (error) {
    console.error('Ошибка в Компас судьбы:', error)
    await safeReply(ctx, () =>
      ctx.reply(
        '⚠️ Видео не удалось отправить. Проверьте наличие файлов.',
        mainMenu
      )
    )
  }
})

// Гадание Голос Вселенной
bot.action('start_voice_of_universe', async (ctx) => {
  await ctx.answerCbQuery()

  const access = await checkAccess(ctx)
  if (!access.granted) {
    try {
      await ctx.deleteMessage()
    } catch (e) {
      console.warn('❗ Не удалось удалить сообщение Голос Вселенной')
    }

    return safeReply(ctx, () =>
      ctx.replyWithPhoto(
        { source: './fortune_tellings/img/no_access.jpg' },
        {
          caption:
            '🚫 <b>Нет доступа к гаданию.</b>\n\n' +
            '🌙 <b>Лимиты пополняются каждую ночь</b>,\n' +
            'но <u>только если у вас осталось 0 лимитов и 0 реферальных бонусов</u>.\n\n' +
            '📉 Если у вас есть хотя бы 1 лимит или бонус —\n' +
            'зачисление <b>не произойдёт</b> до полного обнуления.',
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    )
  }

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
    const shareText = `🪐 Я услышал(а) голос Вселенной в боте «Морфей»!\n✨ Попробуй и ты: https://t.me/MorfejBot?start=utm_voice_ref_${ctx.from.id}`

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
                    '👽 Голос Вселенной\n'
                  )}&text=${encodeURIComponent(shareText)}`
                ),
              ],
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    )

    // ✅ Уменьшаем лимит после отправки
    if (!access.premium) {
      decrementAccess(ctx)
    }
  } catch (error) {
    console.error('Ошибка при гадании Голос Вселенной:', error)
    await safeReply(ctx, () =>
      ctx.reply('⚠️ Не удалось получить послание. Попробуйте позже.', mainMenu)
    )
  }
})

// Начисляет 1 лимит пользователям у которых 0 (каждый день в 03:00)
// Уведомляем пользователей, которым начислен лимит
function notifyGrantedUsers(users) {
  for (const user of users) {
    safeSend(user.chatId, () =>
      bot.telegram.sendMessage(
        user.chatId,
        '🎁 Вам начислено <b>5 бесплатных лимитов</b> на сегодня!\n\nМожете запускать любые гадания.',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '✖ Убрать сообщение',
                  callback_data: 'dismiss_ref_notify',
                },
              ],
            ],
          },
        }
      )
    ).catch((e) => {
      console.warn(
        `❗ Не удалось отправить сообщение userId=${user.userId}:`,
        e.message
      )
    })
  }
}

scheduleDailyLimitGranting(notifyGrantedUsers, 1, 5) // 3 - часы, 0 - минуты

// --- Запуск ---
bot
  .launch()
  .then(() => console.log('Бот запущен'))
  .catch((err) => console.error('Ошибка запуска:', err))

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
