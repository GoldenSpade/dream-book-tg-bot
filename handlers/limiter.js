import Bottleneck from 'bottleneck'

// Глобальный Telegram-лимит: 30 сообщений в секунду
const globalLimiter = new Bottleneck({
  minTime: 36, // ≈28 задач в секунду (1000 / 36 ≈ 27.77 п/сек)
  maxConcurrent: 1, // По одному за раз
})

// Ограничение по пользователю (chatId)
const perUserLimiters = new Map()

/**
 * Получает или создаёт limiter для конкретного пользователя
 * @param {number} chatId
 * @returns {Bottleneck}
 */
function getUserLimiter(chatId) {
  if (!perUserLimiters.has(chatId)) {
    const limiter = new Bottleneck({
      minTime: 1100, // 1 сообщение в секунду на одного пользователя
    })
    limiter.chain(globalLimiter) // цепляем к глобальному
    perUserLimiters.set(chatId, limiter)
  }
  return perUserLimiters.get(chatId)
}

/**
 * Безопасная отправка сообщений с ограничением через Bottleneck.
 * Используется для ctx.reply, ctx.replyWithVideo и т.д.
 * @param {Object} ctx - контекст Telegraf
 * @param {Function} fn - функция, возвращающая промис отправки
 */
async function safeReply(ctx, fn) {
  try {
    const chatId = ctx.chat?.id || ctx.from?.id
    const limiter = getUserLimiter(chatId)

    console.log(`🌀 Bottleneck: Event triggered: received from ${chatId}`)

    // Получаем длину очереди безопасно
    const stats = await limiter.counts()
    console.log('📊 Очередь сейчас:', stats.QUEUED)

    return await limiter.schedule(async () => {
      const innerStats = await limiter.counts()
      console.log(
        `📊 Очередь внутри schedule: ${innerStats.QUEUED} | Выполняется: ${innerStats.RUNNING}`
      )
      console.log(`🚀 Выполняется отправка для ${chatId}`)
      return fn()
    })
  } catch (err) {
    console.error('❌ Ошибка при отправке через Bottleneck:', err)
    try {
      await ctx.reply(
        '⚠️ Ошибка при отправке. Попробуйте позже. Не забудьте нажать /start в боте.'
      )
    } catch (_) {}
  }
}

/**
 * Безопасная отправка по chatId, например: bot.telegram.sendMessage(...)
 * @param {number} chatId
 * @param {Function} fn — функция отправки, возвращающая промис
 */
async function safeSend(chatId, fn) {
  try {
    const limiter = getUserLimiter(chatId)
    return await limiter.schedule(() => fn())
  } catch (err) {
    console.warn('❌ Ошибка в safeSend:', err.message)
  }
}

export { safeSend, safeReply }
