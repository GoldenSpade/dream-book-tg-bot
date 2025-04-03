import { Markup } from 'telegraf'

const mainMenu = Markup.keyboard([
  ['🔍 Поиск по слову', 'ℹ️ О боте'],
  ['🌙 Лунные сны', '📅 Календарные сны'],
  ['❓ Помощь'],
]).resize()

const getShareKeyboard = (shareText, title, isDream = false) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.url(
        '📤 Поделиться' + (isDream ? ' сном' : ''),
        `https://t.me/share/url?url=${encodeURIComponent(
          title
        )}&text=${encodeURIComponent(shareText)}`
      ),
    ],
    [Markup.button.callback('🔙 В меню', 'back_to_menu')],
  ])
}

export { mainMenu, getShareKeyboard }
