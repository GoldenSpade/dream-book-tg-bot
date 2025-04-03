import { getLunarDay } from '../helpers/lunarDay.js'
import { getGregorianDay } from '../helpers/gregorianDay.js'
import { getShareKeyboard } from '../helpers/keyboards.js'

export const commandHandlers = {
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
      const shareText = `${moonInfo}\n✨ Больше толкований: https://t.me/${ctx.botInfo.username}`

      await ctx.reply(moonInfo)
      await ctx.reply(
        `🔗 Поделитесь этим толкованием:`,
        getShareKeyboard(shareText, '🌙 Лунный день')
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
        getShareKeyboard(shareText, '📅 Календарный сон')
      )
    } catch (error) {
      console.error('Ошибка:', error)
      ctx.reply('Произошла ошибка.')
    }
  },
}
