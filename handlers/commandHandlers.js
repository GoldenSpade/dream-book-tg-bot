import { getLunarDay } from '../helpers/lunarDay.js'
import { getGregorianDay } from '../helpers/gregorianDay.js'
import { getRandomFortuneGif } from '../fortune_tellings/yesNo.js'
import { shareKeyboard } from '../helpers/keyboards.js'
import { Markup } from 'telegraf'

export const commandHandlers = {
  '🔍 Поиск по слову': (ctx) => ctx.reply('Введите слово для поиска:'),

  'ℹ️ О боте': (ctx) =>
    ctx.reply(
      '🔮 Сонник с глубоким анализом. Напишите, что вам приснилось — и я расшифрую скрытые смыслы!'
    ),

  '❓ Помощь': (ctx) =>
    ctx.reply(
      'Для поиска трактования сна введите слово длиной больше 3-х символов. Используйте "е" вместо "ё".'
    ),

  '🌙 Лунные сны': async (ctx) => {
    try {
      const moonInfo = getLunarDay()
      const shareText = `${moonInfo}\n✨ Больше толкований: https://t.me/${ctx.botInfo.username}`

      await ctx.reply(moonInfo)
      await ctx.reply(
        `🔗 Поделитесь этим толкованием:`,
        shareKeyboard(shareText, '🌙 Лунный день')
      )
    } catch (error) {
      console.error('Ошибка:', error)
      ctx.reply('Произошла ошибка.')
    }
  },

  '📅 Календарные сны': async (ctx) => {
    try {
      const gregorianInfo = getGregorianDay()
      const shareText = `${gregorianInfo}\n✨ Больше толкований: https://t.me/${ctx.botInfo.username}`

      await ctx.reply(gregorianInfo)
      await ctx.reply(
        `🔗 Поделитесь этим толкованием:`,
        shareKeyboard(shareText, '📅 Календарный сон')
      )
    } catch (error) {
      console.error('Ошибка:', error)
      ctx.reply('Произошла ошибка.')
    }
  },

  '🔮 Гадание Да/Нет': async (ctx) => {
    try {
      const gifBuffer = await getRandomFortuneGif()
      const shareText = `🕯️ Я погадал(а) в боте "Шепот Морфея"!\n\n✨ Попробуй и ты: https://t.me/${ctx.botInfo.username}`

      await ctx.replyWithAnimation(
        { source: gifBuffer },
        {
          caption: '🔮 Оракул ищет ответ...',
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
              [Markup.button.callback('🔙 В меню', 'back_to_menu')],
            ],
          },
        }
      )
    } catch (error) {
      console.error('Ошибка при гадании:', error)
      ctx.reply('Что-то пошло не так, попробуйте ещё раз позже.')
    }
  },
}
