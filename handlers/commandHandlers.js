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
  '📖 Сонник': (ctx) => {
    ctx.reply('📖 Введите слово для поиска', dreamBookMenu),
      Activity.logButtonAction(ctx.from.id, 'main_menu_button', '📖 Сонник')
    User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
  },
  '🔮 Гадания': (ctx) => {
    Activity.logButtonAction(ctx.from.id, 'main_menu_button', '🔮 Гадания')
    User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
    ctx.reply('🔮 Выберите вариант гадания:', fortuneMenu)
  },

  '📋 Инструкция': (ctx) => {
    Activity.logButtonAction(ctx.from.id, 'main_menu_button', '📋 Инструкция')
    User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
    ctx.replyWithHTML(
      `<b>📚 Инструкция по использованию бота:</b>\n\n` +
        `🔍 <b>Поиск по слову</b> - введите слово из вашего сна для получения толкования\n\n` +
        `🌙 <b>Лунные сны</b> - узнайте значение сна по текущему лунному дню\n\n` +
        `📅 <b>Календарные сны</b> - толкование сна по дате Григорианского календаря\n\n` +
        `🔮 <b>Гадание Да/Нет</b> - загадайте вопрос и получите ответ\n\n` +
        `🎧 <b>Морфей говорит</b> - получите мудрость от самого бога снов\n\n` +
        `🕰 <b>Гадание по времени</b> - узнайте судьбу по текущему времени:\n` +
        `   • Анализирует часы, минуты и секунды\n` +
        `   • Определяет особые комбинации (зеркальные, повторяющиеся)\n` +
        `   • Даёт нумерологическое предсказание\n\n` +
        `🧭 <b>Компас судьбы</b> - получите видео-подсказку от Вселенной:\n` +
        `   • Задайте вопрос, мысленно или вслух\n` +
        `   • Нажмите кнопку "Показать ответ"\n` +
        `   • Красная стрелка компаса укажет точный ответ. Да или Нет.\n\n` +
        `<b>ℹ️ О меню в правом нижнем углу:</b>\n` +
        `Вы можете быстро вызвать меню бота в любое время, нажав на кнопку <b>≡</b> в правом нижнем углу экрана (рядом с полем ввода сообщения). Это удобно для навигации между разделами.\n\n` +
        `<i>Для поиска используйте слова длиной более 3 символов. "ё" заменяйте на "е". \n\n</i>` +
        `👨🏻‍💻 Пожелания, предложения, техподдержка: <b>MorfejBot@proton.me</b>`,
      Markup.inlineKeyboard([
        [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
      ])
    )
  },
  '↩️ Назад': (ctx) => ctx.reply('Возвращаемся в главное меню:', mainMenu),

  // Разделы сонника
  '🔍 Поиск по слову': (ctx) =>
    ctx.replyWithHTML(
      '🔎 <b>Введите слово из вашего сна:</b>\n\n' +
        '<i>• Используйте слова от 3 символов\n' +
        '• Заменяйте "ё" на "е"\n' +
        '• Для возврата нажмите "↩️ Назад"</i>',
      backKeyboard
    ),

  '🌙 Лунные сны': async (ctx) => {
    Activity.logButtonAction(ctx.from.id, 'menu_button', '🌙 Лунные сны')
    User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
    try {
      const moonInfo = getLunarDay()
      const shareText = `${moonInfo}\n✨ Больше толкований: https://t.me/${ctx.botInfo.username}`

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
      ctx.reply(
        '⚠️ Произошла ошибка при получении лунных данных.',
        backKeyboard
      )
    }
  },

  '📅 Календарные сны': async (ctx) => {
    Activity.logButtonAction(ctx.from.id, 'menu_button', '📅 Календарные сны')
    User.update(ctx.from.id, {
      lastActivity: new Date().toISOString(),
    })
    try {
      const gregorianInfo = getGregorianDay()
      const shareText = `${gregorianInfo}\n✨ Больше толкований: https://t.me/${ctx.botInfo.username}`

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
      ctx.reply(
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
      '✨ Гадание Да/Нет (главное меню)'
    )
    User.update(ctx.from.id, {
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
      ctx.replyWithHTML(
        '⚠️ <b>Произошла ошибка</b>\nПопробуйте позже',
        backKeyboard
      )
    }
  },

  '🎧 Морфей говорит': async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'fortune_button',
      '🎧 Морфей говорит (главное меню)'
    )
    User.update(ctx.from.id, {
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
      ctx.replyWithHTML(
        '⚠️ <b>Произошла ошибка</b>\nПопробуйте позже',
        backKeyboard
      )
    }
  },

  '⏰ Гадание времени': async (ctx) => {
    Activity.logButtonAction(
      ctx.from.id,
      'fortune_button',
      '⏰ Гадание времени (главное меню)'
    )
    User.update(ctx.from.id, {
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
      '🧭 Компас судьбы (главное меню)'
    )
    User.update(ctx.from.id, {
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

  // Стартовая команда
  '/start': (ctx) => {
    return ctx.replyWithHTML(
      '🌙 <b>Добро пожаловать к "Морфею"!</b>\n\n' +
        '• <b>📖 Сонник</b> - толкование ваших снов\n' +
        '• <b>🔮 Гадания</b> - ответы на вопросы\n' +
        '• <b>📋 Инструкция</b> - как пользоваться ботом\n\n' +
        'Выберите раздел:',
      mainMenu
    )
  },
}
