// Импортируем необходимые модули
import { Telegraf, Markup } from 'telegraf' // Основная библиотека для работы с Telegram API
import 'dotenv/config' // Для работы с переменными окружения из .env файла
import { data } from './data/data.js' // Данные сонника (массив объектов с толкованиями)
import { splitText } from './helpers/splitText.js' // Функция для разбивки длинных текстов
import { searchItems } from './helpers/searchItems.js' // Функция поиска по данным
import { dateFromTimeStamp } from './helpers/dateFromTimeStamp.js' // Форматирование даты
import { User, initDB } from './data/db.js' // Модель пользователя и инициализация БД

// Создаем экземпляр бота с токеном из переменных окружения
const bot = new Telegraf(process.env.API_KEY)

// Настройки кеширования (время жизни кеша - 1 час)
const CACHE_TTL = 60 * 60 * 1000 // 60 минут * 60 секунд * 1000 мс = 1 час в миллисекундах

// Коллекции для хранения данных в памяти
const searchResults = new Map() // Кеш результатов поиска (ключ: ID сообщения, значение: данные)
const sentMessages = new Map() // Трекер отправленных сообщений (ключ: ID чата, значение: массив ID сообщений)

// Инициализация подключения к базе данных
await initDB() // Асинхронная функция, поэтому используем await

// --- Создаем клавиатуры ---
const mainMenu = Markup.keyboard([
  ['🔍 Поиск по слову', 'ℹ️ О боте'], // Первый ряд кнопок
  ['❓ Помощь' /* '☕ Купить нам кофе' */], // Второй ряд (закомментированная кнопка)
]).resize() // Автоматическое масштабирование кнопок

// --- Обработчик команды /start ---
bot.start(async (ctx) => {
  try {
    // Извлекаем данные пользователя из контекста
    const { id, first_name, username } = ctx.from // ctx.from - объект с информацией о пользователе

    // Ищем или создаем пользователя в базе данных
    const [user, created] = await User.findOrCreate({
      where: { userId: id }, // Условие поиска
      defaults: { // Данные для создания, если пользователь не найден
        firstName: first_name,
        username: username || null, // username может быть undefined
      },
    })

    // Логируем результат
    if (created) {
      console.log(`✅ Новый пользователь: ${first_name} (ID: ${id})`)
    } else {
      console.log(`👋 Возвращение пользователя: ${first_name}`)
      // Обновляем время последней активности
      await user.update({ lastActivity: new Date() })
    }

    // Отправляем приветственное сообщение с главным меню
    ctx.reply(
      'Привет! Введите слово для поиска трактования сна или выберите опцию из меню.',
      mainMenu
    )
  } catch (err) {
    console.error('Ошибка при обработке /start:', err)
    ctx.reply('Произошла ошибка при запуске бота. Пожалуйста, попробуйте позже.')
  }
})

// --- Обработчики текстовых команд ---
const commandHandlers = {
  // Обработчик кнопки "Поиск по слову"
  '🔍 Поиск по слову': (ctx) => ctx.reply('Введите слово для поиска:'),
  
  // Обработчик кнопки "О боте"
  'ℹ️ О боте': (ctx) =>
    ctx.reply(
      '🔮 Сонник с глубоким анализом. Напишите, что вам приснилось — и я расшифрую скрытые смыслы!'
    ),
  
  // Обработчик кнопки "Помощь"
  '❓ Помощь': (ctx) =>
    ctx.reply(
      'Для поиска трактования сна введите слово длиной >3 символов. Используйте "е" вместо "ё".'
    ),
}

// --- Middleware для отслеживания отправленных сообщений ---
bot.use(async (ctx, next) => {
  await next() // Сначала пропускаем запрос дальше по цепочке middleware
  
  // Если это сообщение от нашего бота
  if (ctx.message && ctx.from.id === ctx.botInfo.id) {
    // Инициализируем массив для чата, если его нет
    if (!sentMessages.has(ctx.chat.id)) {
      sentMessages.set(ctx.chat.id, [])
    }
    // Добавляем ID сообщения в трекер
    sentMessages.get(ctx.chat.id).push(ctx.message.message_id)
  }
})

// Регистрируем обработчики команд
Object.entries(commandHandlers).forEach(([command, handler]) => {
  bot.hears(command, handler) // Когда бот "слышит" команду - вызывает handler
})

// --- Обработка обычных текстовых сообщений (поиск) ---
bot.on('text', async (ctx) => {
  const { text: target, from, message_id } = ctx.message // Извлекаем текст сообщения и данные отправителя

  // Пропускаем если это команда из commandHandlers
  if (commandHandlers[target]) return

  // Валидация длины запроса
  if (target.length < 3) {
    ctx.reply('🔍 Слово должно быть длиннее 3 символов.', mainMenu)
    return
  }

  try {
    // Ищем совпадения в данных сонника
    const dreams = searchItems(data, target)

    // Если ничего не найдено
    if (!dreams.length) {
      ctx.reply('😕 Ничего не найдено. Попробуйте другое слово.', mainMenu)
      return
    }

    // Создаем кнопки для каждого найденного варианта
    const buttons = dreams.map((dream, index) =>
      Markup.button.callback(
        dream.word, // Текст на кнопке
        `dream_${message_id}_${index}` // Уникальный callback_data
      )
    )

    // Сохраняем результаты в кеш
    searchResults.set(message_id, {
      dreams, // Найденные варианты
      timestamp: Date.now(), // Время сохранения
      userId: ctx.from.id, // ID пользователя
    })

    // Отправляем сообщение с результатами поиска
    const searchResultMessage = await ctx.reply(
      `🔍 Найдено: ${dreams.length} вариантов`,
      Markup.inlineKeyboard( // Встроенная клавиатура
        [...buttons, Markup.button.callback('🔙 Назад', 'back_to_menu')],
        { columns: 2 } // 2 кнопки в ряду
      )
    )

    // Сохраняем ID сообщения в трекер
    if (!sentMessages.has(ctx.chat.id)) {
      sentMessages.set(ctx.chat.id, [])
    }
    sentMessages.get(ctx.chat.id).push(searchResultMessage.message_id)

    // Логируем действие пользователя
    console.log(
      `first_name: ${from.first_name}, username: ${
        from.username
      }, word: ${target}, amount: ${dreams.length}, date: ${dateFromTimeStamp(
        ctx.message.date
      )}`
    )
  } catch (error) {
    console.error('Ошибка поиска:', error)
  }
})

// --- Обработка нажатия на кнопку с вариантом сна ---
bot.action(/^dream_(\d+)_(\d+)$/, async (ctx) => {
  // Извлекаем ID сообщения и индекс варианта из callback_data
  const [_, messageId, index] = ctx.match
  
  // Получаем данные из кеша
  const cached = searchResults.get(Number(messageId))

  // Проверяем актуальность кеша
  if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
    await ctx.answerCbQuery('❌ Результаты устарели. Повторите поиск.')
    return
  }

  // Получаем конкретный вариант сна
  const dream = cached.dreams[Number(index)]
  if (!dream) return

  // Формируем текст толкования (без дублирования названия)
  const interpretationText = `${dream.description}`
  
  // Разбиваем текст на части (ограничение Telegram - 4096 символов)
  const parts = splitText(interpretationText, 4096)

  // Отправляем все части по очереди
  for (const part of parts) {
    const sentMessage = await ctx.reply(part)
    // Сохраняем ID каждого сообщения
    if (!sentMessages.has(ctx.chat.id)) {
      sentMessages.set(ctx.chat.id, [])
    }
    sentMessages.get(ctx.chat.id).push(sentMessage.message_id)
  }

  // Формируем сокращенный текст для шаринга
  const shareText = `${dream.description.substring(0, 100)}...\n\n🔮 Больше толкований: https://t.me/${ctx.botInfo.username}`

  // Отправляем сообщение с кнопкой "Поделиться"
  const shareMessage = await ctx.reply(
    `🔗 Поделитесь толкованием сна "${dream.word}":`,
    Markup.inlineKeyboard([
      [
        Markup.button.url(
          '📤 Поделиться сном с друзьями',
          `https://t.me/share/url?url=${encodeURIComponent(
            `Толкование сна "${dream.word}"`
          )}&text=${encodeURIComponent(shareText)}`
        ),
      ],
      [Markup.button.callback('🔙 В меню', 'back_to_menu')],
    ])
  )

  // Сохраняем ID сообщения с кнопкой
  if (!sentMessages.has(ctx.chat.id)) {
    sentMessages.set(ctx.chat.id, [])
  }
  sentMessages.get(ctx.chat.id).push(shareMessage.message_id)

  // Подтверждаем обработку callback (убираем часики у кнопки)
  ctx.answerCbQuery()
})

// --- Обработка кнопки возврата в меню ---
bot.action('back_to_menu', async (ctx) => {
  await ctx.deleteMessage() // Удаляем сообщение с кнопками
  ctx.reply('Вы вернулись в меню.', mainMenu) // Отправляем главное меню
})

// --- Запуск бота ---
bot
  .launch()
  .then(() => console.log('Бот запущен'))
  .catch((err) => console.error('Ошибка запуска:', err))

// Обработка сигналов завершения работы
process.once('SIGINT', () => bot.stop('SIGINT')) // Ctrl+C
process.once('SIGTERM', () => bot.stop('SIGTERM')) // Сигнал завершения