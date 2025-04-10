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
    1: '🔢 Сейчас время для инициативы. Начни что-то новое.',
    2: '🤝 Время сотрудничества. Не действуй в одиночку.',
    3: '🎨 Прояви творческий подход. Идеи могут воплотиться.',
    4: '🏗 Закладывается фундамент. Работай на перспективу.',
    5: '🌪 Время перемен. Будь гибким и открытым.',
    6: '👨‍👩‍👧‍👦 Обрати внимание на близких. Ищи гармонию.',
    7: '🧘‍♂️ Время размышлений. Слушай внутренний голос.',
    8: '💰 Финансовая энергия. Возможность роста и успеха.',
    9: '🔚 Завершай незавершенное. Освобождай место новому.',
    10: '🚀 Возможность роста. Удача на твоей стороне.',
    11: '✨ Высшее руководство рядом. Доверься интуиции.',
    22: '🌟 Мастер-время. Возможность великого свершения.',
  }

  parts.push(meanings[value] || '🌀 Неизвестная энергия времени.')

  return `🕒 Текущее время: ${timeString}\n` + parts.join('\n')
}

export { getTimeFortune }
