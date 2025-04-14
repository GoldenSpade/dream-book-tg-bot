import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

// Конфигурация
const DB_PATH = './data/database.sqlite'
const EXPORT_DIR = './data/export'
const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})
  .format(new Date())
  .replace(/[/:]/g, '-')
  .replace(', ', '_')

// Создаем папку для экспорта
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true })
}

// Подключаемся к БД
const db = new Database(DB_PATH)

// Функция для корректного преобразования дат SQLite в формат для Excel
function formatDateForExcel(dateString) {
  if (!dateString) return null

  const date = new Date(dateString)

  // Определяем, действует ли летнее время (Киев UTC+3) или зимнее (UTC+2)
  const isSummerTime = date.getTimezoneOffset() < 120 // 120 минут = UTC+2
  const kievOffset = isSummerTime ? 3 : 2

  // Корректируем время на смещение часового пояса
  const adjustedDate = new Date(date.getTime() + kievOffset * 3600 * 1000)

  // Форматируем дату в ISO-подобный формат без временной зоны
  const pad = (num) => num.toString().padStart(2, '0')
  return (
    `${adjustedDate.getFullYear()}-${pad(adjustedDate.getMonth() + 1)}-${pad(
      adjustedDate.getDate()
    )} ` +
    `${pad(adjustedDate.getHours())}:${pad(adjustedDate.getMinutes())}:${pad(
      adjustedDate.getSeconds()
    )}`
  )
}

// Получаем список всех таблиц
function getAllTables() {
  const tables = db
    .prepare(
      `
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%'
  `
    )
    .all()
  return tables.map((t) => t.name)
}

// Экспорт таблицы в CSV
function exportTableToCSV(tableName) {
  try {
    // Получаем данные
    const data = db.prepare(`SELECT * FROM ${tableName}`).all()

    if (data.length === 0) {
      console.log(`Таблица ${tableName} пуста, пропускаем`)
      return
    }

    // Получаем заголовки столбцов
    const columns = Object.keys(data[0])

    // Определяем поля с датами
    const dateColumns = columns.filter(
      (col) =>
        col.toLowerCase().includes('date') ||
        col.toLowerCase().includes('time') ||
        col.toLowerCase().includes('timestamp')
    )

    // Генерируем CSV
    let csvContent = columns.join('\t\t\t') + '\n'

    data.forEach((row) => {
      const rowValues = columns.map((col) => {
        let value = row[col]

        // Преобразуем даты
        if (dateColumns.includes(col) && value) {
          value = formatDateForExcel(value)
        }

        // Экранируем строки
        if (typeof value === 'string') {
          value = `"${value.replace(/"/g, '""')}"`
        }
        return value ?? 'NULL'
      })
      csvContent += rowValues.join('\t\t\t') + '\n'
    })

    // Сохраняем файл
    const fileName = `${tableName}_${DATE_FORMAT}.csv`
    const filePath = path.join(EXPORT_DIR, fileName)
    fs.writeFileSync(filePath, csvContent, 'utf8')

    console.log(`Таблица ${tableName} экспортирована в ${filePath}`)
    return filePath
  } catch (error) {
    console.error(`Ошибка при экспорте таблицы ${tableName}:`, error)
    return null
  }
}

// Основная функция экспорта
function exportAllTables() {
  console.log('Начало экспорта базы данных...')

  const tables = getAllTables()
  console.log(`Найдено таблиц: ${tables.length}`)

  const results = tables.map(exportTableToCSV)

  const successfulExports = results.filter(Boolean).length
  console.log(
    `Экспорт завершен. Успешно: ${successfulExports}/${tables.length}`
  )

  db.close()
  return results.filter(Boolean)
}

// Запускаем экспорт
exportAllTables()
