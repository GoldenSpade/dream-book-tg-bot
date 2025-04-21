// helpers/dailyLimitGrant.js
import { db } from '../data/db.js'

/**
 * Находит пользователей, которым надо начислить лимит, начисляет и возвращает их
 * @returns {Array<{ userId: number, chatId: number }>}
 */
function grantDailyLimits() {
  const users = db
    .prepare(
      `
      SELECT userId, chatId FROM Users
      WHERE 
        (premiumSince IS NULL OR datetime(premiumSince) < datetime('now')) AND
        COALESCE("limit", 0) = 0 AND
        COALESCE(refBonus, 0) = 0
    `
    )
    .all()

  for (const user of users) {
    db.prepare(`UPDATE Users SET "limit" = 1 WHERE userId = ?`).run(user.userId)
  }

  console.log(`🎁 Начислено 1 лимит ${users.length} пользователям`)
  return users
}

/**
 * Планирует запуск grantDailyLimits() в заданное время каждый день
 * @param {Function} notifyFn — функция, вызываемая с массивом пользователей для отправки уведомлений
 */
function scheduleDailyLimitGranting(notifyFn, hour = 3, minute = 0) {
  const now = new Date()
  const nextRun = new Date()

  nextRun.setHours(hour, minute, 0, 0)
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1)
  }

  const delay = nextRun - now

  const hours = Math.floor(delay / 1000 / 60 / 60)
  const minutes = Math.floor((delay / 1000 / 60) % 60)

  console.log(
    `🕒 Следующее начисление лимитов через ${hours} ч. ${minutes} мин. (${nextRun.toLocaleString()})`
  )

  setTimeout(() => {
    const grantedUsers = grantDailyLimits()
    notifyFn(grantedUsers)

    // Повторяем ежедневно
    setInterval(() => {
      const granted = grantDailyLimits()
      notifyFn(granted)
    }, 24 * 60 * 60 * 1000)
  }, delay)
}

export { scheduleDailyLimitGranting }
