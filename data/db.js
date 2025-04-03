import { Sequelize, DataTypes } from 'sequelize'

// Настройка подключения к SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './data/database.sqlite', // Файл БД будет создан автоматически
  logging: false, // Отключаем логи SQL-запросов в консоль
})

// Модель пользователя
const User = sequelize.define('User', {
  userId: {
    type: DataTypes.INTEGER,
    unique: true, // Уникальный ID из Telegram
    allowNull: false,
  },
  firstName: DataTypes.STRING,
  username: DataTypes.STRING,
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },
  isPremium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  premiumSince: {
    type: DataTypes.DATE,
    allowNull: true, // Будет null для обычных пользователей
  },
})

// Инициализация БД
async function initDB() {
  try {
    await sequelize.authenticate()
    await sequelize.sync() // Создаст таблицы, если их нет
    console.log('База данных подключена')
  } catch (error) {
    console.error('Ошибка подключения к БД:', error)
  }
}

export { User, initDB }
