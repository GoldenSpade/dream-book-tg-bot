// helpers/accessControl.js
import { db } from '../data/db.js'

/**
 * Проверка, имеет ли пользователь доступ к гаданию
 * @param {TelegrafContext} ctx
 * @returns {Object} { granted: Boolean, premium: Boolean }
 */
function checkAccess(ctx) {
  const user = db
    .prepare('SELECT * FROM Users WHERE userId = ?')
    .get(ctx.from.id)

  const now = new Date()

  const premiumUntil = user.premiumSince ? new Date(user.premiumSince) : null
  const isPremium = premiumUntil && premiumUntil > now

  if (isPremium) {
    return { granted: true, premium: true }
  }

  if (user.limit > 0) {
    return { granted: true, premium: false }
  }

  return { granted: false, premium: false }
}

/**
 * Уменьшает лимит пользователя на 1
 * @param {TelegrafContext} ctx
 */
function decrementLimit(ctx) {
  db.prepare('UPDATE Users SET "limit" = "limit" - 1 WHERE userId = ?').run(
    ctx.from.id
  )
}

export { checkAccess, decrementLimit }
