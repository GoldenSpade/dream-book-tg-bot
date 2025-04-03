bot.start(async (ctx) => {
  const { id, first_name, username } = ctx.from

  try {
    // Проверяем существование пользователя и добавляем при необходимости
    const [user, created] = await User.findOrCreate({
      where: { userId: id },
      defaults: {
        firstName: first_name,
        username: username || null,
      },
    })

    if (created) {
      console.log(`✅ Новый пользователь: ${first_name} (ID: ${id})`)
    } else {
      console.log(`👋 Возвращение пользователя: ${first_name}`)
      // Обновляем дату последней активности
      await user.update({ lastActivity: new Date() })
    }

    ctx.reply('Добро пожаловать в сонник! 🌙', mainMenu)
  } catch (error) {
    console.error('Ошибка работы с БД:', error)
    ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.')
  }
})
