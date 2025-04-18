// admin/DB_Scripts/addReferralFields.js
import Database from 'better-sqlite3'

const db = new Database('./data/database.sqlite')

try {
  db.prepare(`ALTER TABLE Users ADD COLUMN refCount INTEGER DEFAULT 0`).run()
  console.log('✅ Поле refCount добавлено')
} catch (e) {
  if (e.message.includes('duplicate column name')) {
    console.log('⚠️ Поле refCount уже существует')
  } else {
    console.error('❌ Ошибка при добавлении refCount:', e)
  }
}

try {
  db.prepare(`ALTER TABLE Users ADD COLUMN refBonus INTEGER DEFAULT 0`).run()
  console.log('✅ Поле refBonus добавлено')
} catch (e) {
  if (e.message.includes('duplicate column name')) {
    console.log('⚠️ Поле refBonus уже существует')
  } else {
    console.error('❌ Ошибка при добавлении refBonus:', e)
  }
}
