import { Markup } from 'telegraf'

const mainMenu = Markup.keyboard([
  ['🔍 Поиск по слову', 'ℹ️ О боте'],
  ['🌙 Лунные сны', '📅 Календарные сны'],
  ['🔮 Гадание Да/Нет', '❓ Помощь'],
]).resize()

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

export { mainMenu, shareKeyboard }
