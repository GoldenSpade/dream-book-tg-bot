import { Markup } from 'telegraf'
import { getLunarDay } from '../helpers/lunarDay.js'
import { getGregorianDay } from '../helpers/gregorianDay.js'
import { getMagicBallImage } from '../fortune_tellings/yes_no/yesNo.js'
import { User, Activity } from '../data/db.js'

import {
  dreamBookMenu,
  fortuneMenu,
  mainMenu,
  backKeyboard,
} from '../helpers/keyboards.js'

export const commandHandlers = {
  // Главное меню
  '📖 Сонник': async (ctx) => {
    await ctx.reply('📖 Введите слово для поиска', dreamBookMenu)
    Activity.logButtonAction(
      ctx.from.id,
      'main_menu_button',
      '📖 Сонник',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
  },
  '🔮 Гадания': async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'main_menu_button',
      '🔮 Гадания',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
    await ctx.reply('🔮 Выберите вариант гадания:', fortuneMenu)
  },

  '📋 Инструкция': async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'main_menu_button',
      '📋 Инструкция',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
    await ctx.replyWithHTML(
      `<b>📚 Инструкция по использованию бота:</b>\n\n` +
        `🤖 Бот "Морфей" состоит из двух основных разделов:\n\n` +
        `<b>📖 Сонник</b> — для поиска и толкования снов\n\n` +
        `<b>🔮 Гадания</b> — для получения предсказаний и посланий\n\n` +
        `📘 Полную инструкцию по работе с разделом "Сонник" вы найдёте в меню Сонника\n\n` +
        `📗 Подробную инструкцию по гаданиям — в меню Гаданий\n\n` +
        `<b>ℹ️ Быстрый доступ к меню:</b>\n` +
        `В любом месте бота нажмите кнопку <b>≡</b> в правом нижнем углу Telegram — это удобно для переходов между разделами.\n\n` +
        `<i>Советы по поиску:</i>\n` +
        `• Используйте слова длиннее 3 символов\n` +
        `• Букву "ё" заменяйте на "е"\n\n` +
        `👨🏻‍💻 Связь, предложения и поддержка: <b>MorfejBot@proton.me</b>`,
      Markup.inlineKeyboard([
        [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
      ])
    )
  },

  '📘 Инструкция по соннику': async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'menu_button',
      '📘 Инструкция по снам',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })

    await ctx.replyWithHTML(
      `<b>📘 Инструкция по разделу "Сонник":</b>\n\n` +
        `🔍 <b>Поиск по слову</b> — введите слово из вашего сна для получения трактования\n\n` +
        `🌙 <b>Лунные сны</b> — толкование сна по текущему лунному дню (на основе астрологических ритмов)\n\n` +
        `📅 <b>Календарные сны</b> — интерпретация сна по дате Григорианского календаря\n\n` +
        `📝 Толкования опираются на эзотерические и психологические источники.\n\n` +
        `🔎 Используйте слова длиной от 3 символов. "ё" заменяйте на "е".`,
      Markup.inlineKeyboard([
        [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
      ])
    )
  },

  '📗 Инструкция по гаданиям': async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'menu_button',
      '📗 Инструкция по гаданиям',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })

    await ctx.replyWithHTML(
      `<b>📗 Инструкция по разделу "Гадания"</b>\n\n` +
        `🔮 <b>Гадание Да/Нет</b> — загадайте вопрос и нажмите кнопку, чтобы получить видеоподсказку\n\n` +
        `🎧 <b>Морфей говорит</b> — получите аудио-послание от Морфея после визуального погружения\n\n` +
        `🕰 <b>Гадание по времени</b> — трактование по текущему времени. Зеркальные значения чисел, числовые повторы, нумерология\n\n` +
        `🧭 <b>Компас судьбы</b> — вращение стрелки магического компаса с финальным ответом Да/Нет\n\n` +
        `🪐 <b>Голос Вселенной</b> — космическое видео и трактование. Настройтесь и нажмите "Получить послание"`,
      Markup.inlineKeyboard([
        [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
      ])
    )
  },

  '↩️ Назад': async (ctx) =>
    await ctx.reply('Возвращаемся в главное меню:', mainMenu),

  // Разделы сонника
  '🔍 Поиск по слову': async (ctx) =>
    await ctx.replyWithHTML(
      '🔎 <b>Введите слово из вашего сна:</b>\n\n' +
        '<i>• Используйте слова от 3 символов\n' +
        '• Заменяйте "ё" на "е"\n' +
        '• Для возврата нажмите "↩️ Назад"</i>',
      backKeyboard
    ),

  '🌙 Лунные сны': async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'menu_button',
      '🌙 Лунные сны',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
    try {
      const moonInfo = getLunarDay()
      const shareText = `${moonInfo}\n✨ Больше толкований: https://t.me/MorfejBot?start=utm_lunar_ref_${ctx.from.id}`

      await ctx.replyWithHTML(
        `${moonInfo}\n\n` +
          `<i>Толкование основано на лунной энергетике дня</i>`
      )

      await ctx.reply(
        '🔗 Поделитесь этим толкованием:',
        Markup.inlineKeyboard([
          [
            Markup.button.url(
              '🌙 Поделиться',
              `https://t.me/share/url?url=${encodeURIComponent(
                '🌙 Лунный день'
              )}&text=${encodeURIComponent(shareText)}`
            ),
          ],
          [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
        ])
      )
    } catch (error) {
      console.error('Ошибка в Лунных снах:', error)
      await ctx.reply(
        '⚠️ Произошла ошибка при получении лунных данных.',
        backKeyboard
      )
    }
  },

  '📅 Календарные сны': async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'menu_button',
      '📅 Календарные сны',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
    try {
      const gregorianInfo = getGregorianDay()
      const shareText = `${gregorianInfo}\n✨ Больше толкований: https://t.me/MorfejBot?start=utm_calendar_ref_${ctx.from.id}`

      await ctx.replyWithHTML(
        `${gregorianInfo}\n\n` +
          `<i>Толкование основано на традиционных сонниках</i>`
      )

      await ctx.reply(
        '🔗 Поделитесь этим толкованием:',
        Markup.inlineKeyboard([
          [
            Markup.button.url(
              '📅 Поделиться',
              `https://t.me/share/url?url=${encodeURIComponent(
                '📅 Календарный сон'
              )}&text=${encodeURIComponent(shareText)}`
            ),
          ],
          [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
        ])
      )
    } catch (error) {
      console.error('Ошибка в Календарных снах:', error)
      await ctx.reply(
        '⚠️ Произошла ошибка при получении календарных данных.',
        backKeyboard
      )
    }
  },

  // Гадания
  '✨ Гадание Да/Нет': async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'fortune_button',
      '✨ Гадание Да/Нет (главное меню)',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
    try {
      const magicBallImage = await getMagicBallImage()

      await ctx.replyWithPhoto(
        { source: magicBallImage },
        {
          caption:
            '🔮 <b>Задумайте ваш вопрос</b>\n\nНажмите "✨ Начать" для получения ответа',
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('✨ Начать', 'start_fortune')],
              [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
            ],
          },
        }
      )
    } catch (error) {
      console.error('Ошибка в Гадании:', error)
      await ctx.replyWithHTML(
        '⚠️ <b>Произошла ошибка</b>\nПопробуйте позже',
        backKeyboard
      )
    }
  },

  '🎧 Морфей говорит': async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'fortune_button',
      '🎧 Морфей говорит (главное меню)',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
    try {
      await ctx.replyWithHTML(
        '💫 <b>Тайные врата Морфея открыты...</b>\n\n' +
          '🕯️ Сосредоточьтесь на вопросе который вас интересует\n\n' +
          '🦉 Нажмите на символ ниже для получения послания',
        Markup.inlineKeyboard([
          [Markup.button.callback('🔮 Получить послание', 'start_morpheus')],
          [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
        ])
      )
    } catch (error) {
      console.error('Ошибка в Морфей говорит:', error)
      await ctx.replyWithHTML(
        '⚠️ <b>Произошла ошибка</b>\nПопробуйте позже',
        backKeyboard
      )
    }
  },

  '⏰ Гадание времени': async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'fortune_button',
      '⏰ Гадание времени (главное меню)',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
    await ctx.replyWithVideo(
      { source: './fortune_tellings/time_reading/video/time_reading.mp4' },
      {
        caption:
          '🕒 *Гадание времени*\n\n' +
          '🔮 В это гадание заложен тройной анализ:\n\n' +
          '🪞 Зеркальные значения\n\n' +
          '🔂 Повторяющиеся числа\n\n' +
          '🔢 Нумерология времени\n\n' +
          'Нажми кнопку ниже, чтобы получить предсказание.',
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback('⏰ Начать', 'start_time_fortune')],
            [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
          ],
        },
      }
    )
  },

  '🧭 Компас судьбы': async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'fortune_button',
      '🧭 Компас судьбы (главное меню)',
      ctx.state.referrerId
    )
    await User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
    try {
      await ctx.replyWithPhoto(
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
                {
                  text: '🧭 Показать ответ',
                  callback_data: 'start_compass_fate',
                },
              ],
              [{ text: '⏪ В главное меню', callback_data: 'back_to_menu' }],
            ],
          },
        }
      )
    } catch (error) {
      console.error('Ошибка в Компас судьбы (меню):', error)
      await ctx.reply('⚠️ Произошла ошибка. Попробуйте позже.', mainMenu)
    }
  },

  '🪐 Голос Вселенной': async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'fortune_button',
      '🪐 Голос Вселенной (главное меню)',
      ctx.state.referrerId
    )

    await User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })

    // ⏩ Одно видео + кнопка в одном сообщении
    await ctx.replyWithVideo(
      { source: './fortune_tellings/voice_of_universe/intro/space_intro.mp4' },
      {
        caption:
          '🦋🧿<b>Голос Вселенной</b>\n\n' +
          'Задайте вопрос, закройте глаза... и нажмите кнопку ниже.\n' +
          'Ответ придёт в виде <i>видео и космического послания</i>',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '🪐 Получить послание',
                'start_voice_of_universe'
              ),
            ],
            [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
          ],
        },
      }
    )
  },

  // Стартовая команда
  '/start': async (ctx) => {
    return await ctx.replyWithHTML(
      '🌙 <b>Добро пожаловать к "Морфею"!</b>\n\n' +
        '• <b>📖 Сонник</b> - толкование ваших снов\n' +
        '• <b>🔮 Гадания</b> - ответы на вопросы\n' +
        '• <b>📋 Инструкция</b> - как пользоваться ботом\n\n' +
        'Выберите раздел:',
      mainMenu
    )
  },
}
