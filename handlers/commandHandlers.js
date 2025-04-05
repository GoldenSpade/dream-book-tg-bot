import { getLunarDay } from '../helpers/lunarDay.js'
import { getGregorianDay } from '../helpers/gregorianDay.js'
import { shareKeyboard } from '../helpers/keyboards.js'
import { startFortuneKeyboard } from '../helpers/keyboards.js'
import {
  getRandomFortune,
  getMagicBallImage,
} from '../fortune_tellings/yes_no/yesNo.js'

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
      const magicBallImage = await getMagicBallImage()

      await ctx.replyWithPhoto(
        { source: magicBallImage },
        {
          caption: '🔮 Задумайте ваш вопрос и нажмите на кнопку "Начать"',
          reply_markup: startFortuneKeyboard.reply_markup,
        }
      )
    } catch (error) {
      console.error('Ошибка при запуске гадания:', error)
      ctx.reply('Что-то пошло не так, попробуйте ещё раз позже.')
    }
  },
}
