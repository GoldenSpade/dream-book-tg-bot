import { Markup } from 'telegraf'
import { User, Activity } from '../data/db.js'
import { safeReply } from './limiter.js'
import { getLunarDay } from '../helpers/lunarDay.js'
import { getGregorianDay } from '../helpers/gregorianDay.js'
import { getMagicBallImage } from '../fortune_tellings/yes_no/yesNo.js'
import { dreamBookMenu, fortuneMenu } from '../helpers/keyboards.js'

export const commandHandlers = {
  dream_menu: async (ctx) => {
    await safeReply(ctx, () =>
      ctx.reply('📖 Введите слово для поиска', dreamBookMenu)
    )
    Activity.logButtonAction(
      ctx.from.id,
      'main_menu_button',
      '📖 Сонник',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, { lastActivity: new Date().toISOString() })
  },
  fortune_menu: async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'main_menu_button',
      '🔮 Гадания',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, { lastActivity: new Date().toISOString() })
    await safeReply(ctx, () =>
      ctx.reply('🔮 Выберите вариант гадания:', fortuneMenu)
    )
  },
  general_instruction: async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'main_menu_button',
      '📋 Инструкция',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, { lastActivity: new Date().toISOString() })
    await safeReply(ctx, () =>
      ctx.replyWithHTML(
        `<b>📚 Инструкция по использованию бота:</b>\n\n` +
          `🤖 Бот \"Морфей\" состоит из двух основных разделов:\n\n` +
          `<b>📖 Сонник</b> — для поиска и толкования снов\n\n` +
          `<b>🔮 Гадания</b> — для получения предсказаний и посланий\n\n` +
          `📘 Полную инструкцию по работе с разделом \"Сонник\" вы найдёте в меню Сонника\n\n` +
          `📗 Подробную инструкцию по гаданиям — в меню Гаданий\n\n` +
          `<b>ℹ️ Быстрый доступ к меню:</b>\n` +
          `В любом месте бота нажмите кнопку <b>≡</b> в правом нижнем углу Telegram — это удобно для переходов между разделами.\n\n` +
          `<i>Советы по поиску:</i>\n` +
          `• Используйте слова длиннее 3 символов\n` +
          `• Букву \"ё\" заменяйте на \"е\"\n\n` +
          `👨🏻‍💻 Связь, предложения и поддержка: <b>MorfejBot@proton.me</b>`,
        Markup.inlineKeyboard([
          [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
        ])
      )
    )
  },
  dream_instruction: async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'menu_button',
      '📘 Инструкция по снам',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, { lastActivity: new Date().toISOString() })
    await safeReply(ctx, () =>
      ctx.replyWithHTML(
        `<b>📘 Инструкция по разделу \"Сонник\":</b>\n\n` +
          `🔍 <b>Поиск по слову</b> — введите слово из вашего сна для получения трактования\n\n` +
          `🌙 <b>Лунные сны</b> — толкование сна по текущему лунному дню (на основе астрологических ритмов)\n\n` +
          `📅 <b>Календарные сны</b> — интерпретация сна по дате Григорианского календаря\n\n` +
          `📝 Толкования опираются на эзотерические и психологические источники.\n\n` +
          `🔎 Используйте слова длиной от 3 символов. \"ё\" заменяйте на \"е\".`,
        Markup.inlineKeyboard([
          [Markup.button.callback('⏪ В меню сонника', 'back_to_dreams')],
        ])
      )
    )
  },
  fortune_instruction: async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'menu_button',
      '📗 Инструкция по гаданиям',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, { lastActivity: new Date().toISOString() })
    await safeReply(ctx, () =>
      ctx.replyWithHTML(
        `<b>📗 Инструкция по разделу \"Гадания\"</b>\n\n` +
          `🔮 <b>Гадание Да/Нет</b> — загадайте вопрос и нажмите кнопку, чтобы получить видеоподсказку\n\n` +
          `🎧 <b>Морфей говорит</b> — получите аудио-послание от Морфея после визуального погружения\n\n` +
          `🕰 <b>Гадание по времени</b> — трактование по текущему времени. Зеркальные значения чисел, числовые повторы, нумерология\n\n` +
          `🧭 <b>Компас судьбы</b> — вращение стрелки магического компаса с финальным ответом Да/Нет\n\n` +
          `🪐 <b>Голос Вселенной</b> — космическое видео и трактование. Настройтесь и нажмите \"Получить послание\"`,
        Markup.inlineKeyboard([
          [Markup.button.callback('⏪ В меню гаданий', 'back_to_fortune')],
        ])
      )
    )
  },
  dream_search: async (ctx) => {
    await safeReply(ctx, () =>
      ctx.replyWithHTML(
        '🔎 <b>Введите слово из вашего сна:</b>\n\n' +
          '<i>• Используйте слова от 3 символов\n' +
          '• Заменяйте "ё" на "е"\n' +
          '• Для возврата нажмите кнопку ниже</i>',
        Markup.inlineKeyboard([
          [Markup.button.callback('⏪ В меню сонника', 'back_to_dreams')],
        ])
      )
    )
  },

  dream_lunar: async (ctx) => {
    await ctx.deleteMessage().catch(() => {})

    Activity.logButtonAction(
      ctx.from.id,
      'menu_button',
      '🌙 Лунные сны',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, { lastActivity: new Date().toISOString() })

    const moonInfo = getLunarDay()
    const shareText = `${moonInfo}\n✨ Больше толкований: https://t.me/MorfejBot?start=utm_lunar_ref_${ctx.from.id}`

    // Отправка только одного сообщения: толкование + кнопки
    await safeReply(ctx, () =>
      ctx.replyWithHTML(
        `${moonInfo}\n\n<i>Толкование основано на лунной энергетике дня</i>`,
        Markup.inlineKeyboard([
          [
            Markup.button.url(
              '🌙 Поделиться',
              `https://t.me/share/url?url=${encodeURIComponent(
                '🌙 Лунный день'
              )}&text=${encodeURIComponent(shareText)}`
            ),
          ],
          [Markup.button.callback('⏪ В меню сонника', 'back_to_dreams')],
        ])
      )
    )
  },

  dream_calendar: async (ctx) => {
    await ctx.deleteMessage().catch(() => {})

    Activity.logButtonAction(
      ctx.from.id,
      'menu_button',
      '📅 Календарные сны',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, { lastActivity: new Date().toISOString() })

    const gregorianInfo = getGregorianDay()
    const shareText = `${gregorianInfo}\n✨ Больше толкований: https://t.me/MorfejBot?start=utm_calendar_ref_${ctx.from.id}`

    await safeReply(ctx, () =>
      ctx.replyWithHTML(
        `${gregorianInfo}\n\n<i>Толкование основано на традиционных сонниках</i>`,
        Markup.inlineKeyboard([
          [
            Markup.button.url(
              '📅 Поделиться',
              `https://t.me/share/url?url=${encodeURIComponent(
                '📅 Календарный сон'
              )}&text=${encodeURIComponent(shareText)}`
            ),
          ],
          [Markup.button.callback('⏪ В меню сонника', 'back_to_dreams')],
        ])
      )
    )
  },

  fortune_yesno: async (ctx) => {
    const image = await getMagicBallImage()
    await safeReply(ctx, () =>
      ctx.replyWithPhoto(
        { source: image },
        {
          caption:
            '🔮 Задумайте ваш вопрос\n\nНажмите "✨ Начать" для получения ответа',
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('✨ Начать', 'start_fortune')],
              [Markup.button.callback('⏪ В меню гаданий', 'back_to_fortune')],
            ],
          },
        }
      )
    )
  },
  fortune_morpheus: async (ctx) => {
    await safeReply(ctx, () =>
      ctx.replyWithPhoto(
        { source: './fortune_tellings/morpheus_says/img/morpheus_cover.jpg' },
        {
          caption:
            '💫 Тайные врата Морфея открыты...\n\n🕯️ Сосредоточьтесь на вопросе который вас интересует\n\n🦉 Нажмите на символ ниже для получения послания',
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔮 Получить послание',
                  'start_morpheus'
                ),
              ],
              [Markup.button.callback('⏪ В меню гаданий', 'back_to_fortune')],
            ],
          },
        }
      )
    )
  },
  fortune_time: async (ctx) => {
    await safeReply(ctx, () =>
      ctx.replyWithPhoto(
        { source: './fortune_tellings/time_reading/img/time_result.jpg' },
        {
          caption:
            '🕒 *Гадание времени*\n\n⌚ Гадание фиксирует текущее время (часов/минут/секунд) и проводит нумерологический анализ по числам\n\n🔮 В это гадание заложен тройной анализ\n\n🪞 зеркальные значения\n🔂 Повторяющиеся числа\n🔢 нумерология времени\n\nНажми кнопку ниже, чтобы получить предсказание',
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('⏰ Начать', 'start_time_fortune')],
              [Markup.button.callback('⏪ В меню гаданий', 'back_to_fortune')],
            ],
          },
        }
      )
    )
  },
  fortune_compass: async (ctx) => {
    await safeReply(ctx, () =>
      ctx.replyWithPhoto(
        {
          source: './fortune_tellings/compass_of_fate/img/compass_of_fate.jpg',
        },
        {
          caption:
            '🔮 Задумайте свой вопрос...\nКогда будете готовы — нажмите на кнопку ниже 👇',
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🧭 Показать ответ',
                  'start_compass_fate'
                ),
              ],
              [Markup.button.callback('⏪ В меню гаданий', 'back_to_fortune')],
            ],
          },
        }
      )
    )
  },
  fortune_voice: async (ctx) => {
    await safeReply(ctx, () =>
      ctx.replyWithVideo(
        {
          source: './fortune_tellings/voice_of_universe/intro/space_intro.mp4',
        },
        {
          caption:
            '🦋🧿<b>Голос Вселенной</b>\n\n🚀 Задайте вопрос и нажмите кнопку ниже.\nОтвет придёт в виде <i>видео и космического послания</i>',
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🪐 Получить послание',
                  'start_voice_of_universe'
                ),
              ],
              [Markup.button.callback('⏪ В меню гаданий', 'back_to_fortune')],
            ],
          },
        }
      )
    )
  },
}
