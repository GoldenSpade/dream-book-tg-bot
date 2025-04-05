import { Markup } from 'telegraf'

const mainMenu = Markup.keyboard([
  ['🔍 Поиск по слову', '🌙 Лунные сны'],
  ['🔮 Гадание Да/Нет', '📅 Календарные сны'],
  ['📋 Инструкция'],
]).resize()

const startFortuneKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('✨ Начать', 'start_fortune')],
  [Markup.button.callback('🔙 В меню', 'back_to_menu')],
])

const shareKeyboard = (shareText, title, isFortune = false) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.url(
        isFortune ? '🕯️ Поделиться гаданием с друзьями' : '📤 Поделиться сном',
        `https://t.me/share/url?url=${encodeURIComponent(
          title
        )}&text=${encodeURIComponent(shareText)}`
      ),
    ],
    [Markup.button.callback('🔙 В меню', 'back_to_menu')],
  ])
}

export { mainMenu, startFortuneKeyboard, shareKeyboard }
