// admin/DB_Scripts/adminStats.js
import { db } from '../../data/db.js'
import fs from 'fs'
import path from 'path'

function getAdminStats() {
  const totalUsers = db
    .prepare(`SELECT COUNT(*) AS count FROM Users`)
    .get().count
  const active24h = db
    .prepare(
      `SELECT COUNT(*) AS count FROM Users WHERE datetime(lastActivity) >= datetime('now', '-1 day')`
    )
    .get().count
  const active7d = db
    .prepare(
      `SELECT COUNT(*) AS count FROM Users WHERE datetime(lastActivity) >= datetime('now', '-7 day')`
    )
    .get().count
  const premiumUsers = db
    .prepare(
      `SELECT COUNT(*) AS count FROM Users WHERE premiumSince IS NOT NULL AND datetime(premiumSince) > datetime('now')`
    )
    .get().count
  const withRefBonus = db
    .prepare(
      `SELECT COUNT(*) AS count FROM Users WHERE COALESCE(refBonus, 0) > 0`
    )
    .get().count

  const stats = {
    date: new Date().toISOString(),
    totalUsers,
    active24h,
    active7d,
    premiumUsers,
    withRefBonus,
  }

  // Вывод в консоль
  console.log('📊 Статистика бота Морфей:')
  console.log(stats)

  // Сохранение в CSV
  const exportDir = path.join('data', 'export')
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = path.join(exportDir, `Stats_${timestamp}.csv`)

  const headers = Object.keys(stats).join(',')
  const values = Object.values(stats).join(',')

  const csvContent = `${headers}\n${values}`

  fs.writeFileSync(filePath, csvContent)
  console.log(`✅ Сохранено в файл: ${filePath}`)
}

getAdminStats()
