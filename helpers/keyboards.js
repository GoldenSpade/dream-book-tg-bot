// 📁 keyboards.js
import { Markup } from 'telegraf'

// Главное меню (inline)
const mainMenu = Markup.inlineKeyboard([
  [
    Markup.button.callback('📖 Сонник', 'menu_dreambook'),
    Markup.button.callback('🔮 Гадания', 'menu_fortune'),
  ],
  [Markup.button.callback('📋 Инструкция', 'menu_instruction')],
])

// Меню сонника (inline)
const dreamBookMenu = Markup.inlineKeyboard([
  [Markup.button.callback('🔍 Поиск по слову', 'dream_search')],
  [
    Markup.button.callback('🌙 Лунные сны', 'dream_lunar'),
    Markup.button.callback('📅 Календарные сны', 'dream_calendar'),
  ],
  [
    Markup.button.callback('📘 Инструкция по соннику', 'dream_instruction'),
    Markup.button.callback('⏪ В главное меню', 'back_to_menu'),
  ],
])

// Меню гаданий (inline)
const fortuneMenu = Markup.inlineKeyboard([
  [
    Markup.button.callback('✨ Гадание Да/Нет', 'fortune_yesno'),
    Markup.button.callback('🎧 Морфей говорит', 'fortune_morpheus'),
  ],
  [
    Markup.button.callback('⏰ Гадание времени', 'fortune_time'),
    Markup.button.callback('🧭 Компас судьбы', 'fortune_compass'),
  ],
  [
    Markup.button.callback('🪐 Голос Вселенной', 'fortune_voice'),
    Markup.button.callback('📗 Инструкция по гаданиям', 'fortune_instruction'),
  ],
  [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
])

// Общая кнопка возврата
const backKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('⏪ В главное меню', 'back_to_menu')],
])

export { mainMenu, dreamBookMenu, fortuneMenu, backKeyboard }
