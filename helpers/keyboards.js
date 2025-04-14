import { Markup } from 'telegraf'

// Главное меню (3 кнопки)
const mainMenu = Markup.keyboard([
  ['📖 Сонник', '🔮 Гадания'],
  ['📋 Инструкция'],
]).resize()

// Меню сонника
const dreamBookMenu = Markup.keyboard([
  ['🔍 Поиск по слову'],
  ['🌙 Лунные сны', '📅 Календарные сны'],
  ['📘 Инструкция по соннику', '↩️ Назад'],
]).resize()

// Меню гаданий
const fortuneMenu = Markup.keyboard([
  ['✨ Гадание Да/Нет', '🎧 Морфей говорит'],
  ['⏰ Гадание времени', '🧭 Компас судьбы'],
  ['🪐 Голос Вселенной', '📗 Инструкция по гаданиям'],
  ['↩️ Назад'],
]).resize()

// Клавиатура для возврата
const backKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
])

export { mainMenu, dreamBookMenu, fortuneMenu, backKeyboard }
