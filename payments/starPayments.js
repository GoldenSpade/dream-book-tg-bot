// payment/starPayments.js
import { Markup } from 'telegraf'
import { db } from '../data/db.js'
import { safeReply } from '../handlers/limiter.js'

// Варианты покупок
const PRODUCTS = {
  premium_1d: {
    title: 'Премиум на 1 день',
    payload: 'premium_1d',
    description: 'Доступ ко всем гаданиям на 24 часа',
    price: 70,
    days: 1,
  },
  premium_7d: {
    title: 'Премиум на 7 дней',
    payload: 'premium_7d',
    description: 'Доступ ко всем гаданиям на 7 дней',
    price: 250,
    days: 7,
  },
  premium_30d: {
    title: 'Премиум на 30 дней',
    payload: 'premium_30d',
    description: 'Доступ ко всем гаданиям на 30 дней',
    price: 600,
    days: 30,
  },
  limits_3: {
    title: '3 лимита',
    payload: 'limits_3',
    description: 'Доступ к 3 гаданиям',
    price: 30,
    amount: 3,
  },
  limits_10: {
    title: '10 лимитов',
    payload: 'limits_10',
    description: 'Доступ к 10 гаданиям',
    price: 60,
    amount: 10,
  },
  limits_30: {
    title: '30 лимитов',
    payload: 'limits_30',
    description: 'Доступ к 30 гаданиям',
    price: 150,
    amount: 30,
  },
}

async function showPremiumOptions(ctx) {
  await safeReply(ctx, () => {
    ctx.reply(
      '💎 Выберите премиум-доступ:',
      Markup.inlineKeyboard([
        [Markup.button.callback('💎 1 день — 70 ⭐', 'buy_premium_1d')],
        [Markup.button.callback('💎 7 дней — 250 ⭐', 'buy_premium_7d')],
        [Markup.button.callback('💎 30 дней — 600 ⭐', 'buy_premium_30d')],
        [Markup.button.callback('⏪ Назад', 'menu_account')],
      ])
    )
  })
}

async function showLimitOptions(ctx) {
  await safeReply(ctx, () => {
    ctx.reply(
      '➕ Выберите пакет лимитов:',
      Markup.inlineKeyboard([
        [Markup.button.callback('3 лимита — 30 ⭐', 'buy_limits_3')],
        [Markup.button.callback('10 лимитов — 60 ⭐', 'buy_limits_10')],
        [Markup.button.callback('30 лимитов — 150 ⭐', 'buy_limits_30')],
        [Markup.button.callback('⏪ Назад', 'menu_account')],
      ])
    )
  })
}

async function sendStarInvoice(ctx, key) {
  const product = PRODUCTS[key]
  if (!product) return

  await ctx.sendInvoice({
    title: product.title,
    description: product.description,
    payload: product.payload,
    provider_token: '', // Telegram Stars — пустой токен
    currency: 'XTR',
    prices: [{ label: product.title, amount: product.price }],
    start_parameter: 'stars_buy',
  })
}

async function handleSuccessfulPayment(ctx) {
  const { invoice_payload } = ctx.message.successful_payment
  const product = PRODUCTS[invoice_payload]
  if (!product) return

  const userId = ctx.from.id
  if (invoice_payload.startsWith('premium')) {
    const now = new Date()
    const until = new Date(now.getTime() + product.days * 24 * 60 * 60 * 1000)
    db.prepare('UPDATE Users SET premiumSince = ? WHERE userId = ?').run(
      until.toISOString(),
      userId
    )
    await safeReply(ctx, () =>
      ctx.reply(
        `✅ Премиум активирован на ${product.days} дн.`,
        Markup.inlineKeyboard([
          [Markup.button.callback('👤 Мой аккаунт', 'menu_account')],
        ])
      )
    )
  }

  if (invoice_payload.startsWith('limits')) {
    const user = db.prepare('SELECT * FROM Users WHERE userId = ?').get(userId)
    const updated = (user.limit || 0) + product.amount
    db.prepare('UPDATE Users SET "limit" = ? WHERE userId = ?').run(
      updated,
      userId
    )
    await safeReply(ctx, () =>
      ctx.reply(
        `✅ Вам начислено ${product.amount} лимитов.`,
        Markup.inlineKeyboard([
          [Markup.button.callback('👤 Мой аккаунт', 'menu_account')],
        ])
      )
    )
  }
}

export {
  showPremiumOptions,
  showLimitOptions,
  sendStarInvoice,
  handleSuccessfulPayment,
}
