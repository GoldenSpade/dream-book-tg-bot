import { Markup } from 'telegraf'
import { getLunarDay } from '../helpers/lunarDay.js'
import { getGregorianDay } from '../helpers/gregorianDay.js'
import { shareKeyboard } from '../helpers/keyboards.js'
import { startFortuneKeyboard } from '../helpers/keyboards.js'
import { getMagicBallImage } from '../fortune_tellings/yes_no/yesNo.js'

export const commandHandlers = {
  '🔍 Поиск по слову': (ctx) => ctx.reply('Введите слово для поиска:'),

  '📋 Инструкция': (ctx) =>
    ctx.replyWithHTML(
      `<b>📚 Инструкция по использованию бота:</b>\n\n` +
        `🔍 <b>Поиск по слову</b> - введите слово из вашего сна для получения толкования\n\n` +
        `🌙 <b>Лунные сны</b> - узнайте значение сна по текущему лунному дню\n\n` +
        `📅 <b>Календарные сны</b> - толкование сна по дате Григорианского календаря\n\n` +
        `🔮 <b>Гадание Да/Нет</b> - загадайте вопрос и получите ответ\n\n` +
        `❓ <b>Помощь</b> - краткая справочная информация\n\n` +
        `<i>Для поиска снов используйте слова длиной более 3 символов. "ё" заменяйте на "е".</i>`,
      Markup.inlineKeyboard([
        [Markup.button.callback('🔙 В меню', 'back_to_menu')],
      ])
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
