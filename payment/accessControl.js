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

  if (user.refBonus > 0) {
    return { granted: true, premium: false, use: 'refBonus' }
  }

  if (user.limit > 0) {
    return { granted: true, premium: false, use: 'limit' }
  }

  return { granted: false, premium: false }
}

/**
 * Уменьшает лимит пользователя на 1
 * @param {TelegrafContext} ctx
 */
function decrementAccess(ctx) {
  const user = db
    .prepare('SELECT * FROM Users WHERE userId = ?')
    .get(ctx.from.id)

  const now = new Date()
  const premiumUntil = user.premiumSince ? new Date(user.premiumSince) : null
  const isPremium = premiumUntil && premiumUntil > now

  if (isPremium) return // ничего не списываем

  if (user.refBonus > 0) {
    db.prepare('UPDATE Users SET refBonus = refBonus - 1 WHERE userId = ?').run(
      ctx.from.id
    )
    return
  }

  if (user.limit > 0) {
    db.prepare('UPDATE Users SET "limit" = "limit" - 1 WHERE userId = ?').run(
      ctx.from.id
    )
  }
}

export { checkAccess, decrementAccess }
