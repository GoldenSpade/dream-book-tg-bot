// fortune_tellings/time_reading/timeReading.js

function getNumerologicalValue(time) {
  const digits = time
    .toString()
    .split('')
    .filter((char) => /\d/.test(char))
    .map(Number)

  let sum = digits.reduce((acc, val) => acc + val, 0)

  while (![10, 11, 22].includes(sum) && sum > 9) {
    sum = sum
      .toString()
      .split('')
      .map(Number)
      .reduce((acc, val) => acc + val, 0)
  }

  return sum
}

function isPalindrome(timeString) {
  const digitsOnly = timeString.replace(/[^\d]/g, '')
  return digitsOnly === digitsOnly.split('').reverse().join('')
}

function isRepeated(timeString) {
  const [h, m, s] = timeString.split(':')
  return h === m && m === s
}

function getTimeFortune() {
  const now = new Date()
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

  const value = getNumerologicalValue(timeString)

  const parts = []

  // Зеркальные
  if (isPalindrome(timeString)) {
    parts.push(
      '🪞 *Зеркальное время* — Вселенная отражает твои мысли. Всё происходящее — отражение тебя самого.'
    )
  }

  // Повторяющиеся
  if (isRepeated(timeString)) {
    parts.push(
      '🔂 *Повторяющиеся числа* — Синхроничность во всём. Сейчас можно загадывать желания.'
    )
  }

  // Классическая нумерология
  const meanings = {
    1: '🔥 Сейчас время для инициативы и лидерства. У тебя есть шанс начать что-то важное. Не упусти момент.',
    2: '🤝 День партнёрства. Будь внимателен(на) к другим, не навязывай, а поддерживай. Сила — в союзе.',
    3: '🎭 Идеи витают в воздухе. Прояви себя: пиши, пой, твори — тебя услышат.',
    4: '🏗 Надёжная энергия. Построй фундамент для будущего. Спешка сегодня ни к чему.',
    5: '🌪 Ветер перемен рядом. Готовься к неожиданному повороту. Будь гибким(ой) и мобильным(ой).',
    6: '👨‍👩‍👧‍👦 Время для семьи, любви и заботы. Гармония — твой щит сегодня.',
    7: '🧘‍♂️ Углубись в размышления. Ответ не снаружи, а внутри. Тишина — источник ясности.',
    8: '💼 День, связанный с карьерой, деньгами и властью. Принимай решения с расчётом.',
    9: '🔚 Заверши начатое. Освободи место для нового. Отпустить — тоже мудрость.',
    10: '🚀 Число силы. Возможности открываются — бери на себя ответственность. Ты готов(а).',
    11: '✨ Ты на духовной волне. Прислушайся к знакам, доверься интуиции — это проводник.',
    13: '🕯 Тайна и трансформация. Может казаться хаосом, но внутри — рост. Главное — не бояться.',
    22: '🌟 Мастер-время. Твои идеи могут обрести форму. Строй с размахом — поддержка рядом.',
    33: '💫 Высшее служение. Помоги другим — и откроется нечто большее. Это день великой миссии.',
  }

  parts.push(meanings[value] || '🌀 Неизвестная энергия времени.')

  return `🕒 Текущее время: ${timeString}\n\n` + parts.join('\n')
}

export { getTimeFortune }
