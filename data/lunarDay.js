import SunCalc from 'suncalc'

const dreamsByDay = [
  { day: 1, description: 'Сон в этот день предвещает радость' },
  { day: 2, description: 'Сон, как правило, ничего не значит' },
  { day: 3, description: 'Сон, как правило, никогда не сбывается' },
  { day: 4, description: 'Сон, как правило, сбывается' },
  {
    day: 5,
    description:
      'Сон в этот день крайне редко бывает пророческим, но иногда сбывается',
  },
  {
    day: 6,
    description:
      'приснившееся вам в этот день лучше хранить в тайне и никому не рассказывать',
  },
  {
    day: 7,
    description: 'Сон, как правило, сбывается, но не всегда быстро',
  },
  {
    day: 8,
    description:
      'в этот день сны часто имеют пророческую силу; как правило, им можно доверять',
  },
  {
    day: 9,
    description: 'Сон, как правило, сбывается, но не всегда быстро',
  },
  { day: 10, description: 'Сон, как правило, ничего не значит' },
  {
    day: 11,
    description: 'Сон, как правило, сбывается, иногда имеет пророческую силу',
  },
  {
    day: 12,
    description: 'Сон, как правило, сбывается, иногда очень быстро',
  },
  { day: 13, description: 'Сон сбывается, иногда очень быстро' },
  {
    day: 14,
    description: 'сновидения сомнительны и, как правило, ничего не значат',
  },
  {
    day: 15,
    description:
      'Сон, как правило, сбывается в течение месяца и может иметь пророческую силу',
  },
  {
    day: 16,
    description: 'в этот день сну, как правило, можно доверять',
  },
  {
    day: 17,
    description: 'Сон, как правило, сбывается в течение трех дней',
  },
  {
    day: 18,
    description: 'Сон часто сбывается, иногда имеет пророческую силу',
  },
  { day: 19, description: 'Сон, как правило, сбывается' },
  { day: 20, description: 'Сон, как правило, не сбывается' },
  { day: 21, description: 'Сон, как правило, ничего не значит' },
  { day: 22, description: 'Сон, как правило, сбывается' },
  {
    day: 23,
    description: 'Сон неправдивый и, как правило, ничего не значит',
  },
  {
    day: 24,
    description: 'Сон пустой и, как правило, ничего не значит',
  },
  { day: 25, description: 'Сон, как правило, ничего не значит' },
  { day: 26, description: 'Сон чаще всего сбывается' },
  { day: 27, description: 'Сон, как правило, сбывается' },
  { day: 28, description: 'приснившееся в этот день приносит счастье' },
]

function getLunarDay(date = new Date()) {
  const lunarAge = SunCalc.getMoonIllumination(date).phase * 29.53
  const lunarDay = Math.floor(lunarAge) + 1
  const today = dreamsByDay.find((el) => el.day === lunarDay) ?? false

  if (today) {
    return `Сегодня ${today.day}-й лунный день. ${today.description}.`
  } else {
    return 'Извините. Текущий лунный день не удалось найти в нашей базе.'
  }
}

export { getLunarDay }
