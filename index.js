import { Telegraf, Markup } from 'telegraf';
import data from './data/data.js';
import 'dotenv/config.js'

const bot = new Telegraf(process.env.API_KEY);

const searchResults = new Map();

// Функция для разбиения текста на части по максимальной длине
const splitText = (text, maxLength) => {
  const parts = [];
  while (text.length > maxLength) {
    let part = text.substring(0, maxLength);
    const lastSpace = part.lastIndexOf('\n');
    if (lastSpace !== -1) {
      part = part.substring(0, lastSpace);
    }
    parts.push(part);
    text = text.substring(part.length);
  }
  parts.push(text);
  return parts;
};

bot.start(ctx => ctx.reply('Привет! Введите слово для поиска трактования сна.'));

bot.on('text', async ctx => {
  const target = ctx.message.text;
  if (target.length >= 3) {
    const dreams = searchItems(target);
    if (Array.isArray(dreams) && dreams.length > 0) {
      const buttons = dreams.map((el, index) =>
        Markup.button.callback(
          el.word,
          `dream_${ctx.message.message_id}_${index}`
        )
      );
      await ctx.reply(
        `Найдено вариантов ${dreams.length}:`,
        Markup.inlineKeyboard(buttons, { columns: 2 })
      );
      searchResults.set(ctx.message.message_id, dreams);
      console.log(target, dreams.length);
    } else {
      ctx.reply('Слово не найдено. Попробуйте описать другим словом. Вместо буквы "ё" используйте букву "е". Можете прпоробовать написать во множественном числе.');
      console.log('Слово не найдено. Попробуйте описать другим словом.');
    }
  } else {
    ctx.reply('Слово должно быть больше 3-х символов.');
  }
});

const searchItems = target => {
  return data.filter(el => el.word.toLowerCase().includes(target.toLowerCase()));
};

bot.action(/dream_(\d+)_(\d+)/, async ctx => {
  const messageId = parseInt(ctx.match[1]);
  const index = parseInt(ctx.match[2]);
  const dreams = searchResults.get(messageId);
  if (dreams && dreams[index]) {
    const dream = dreams[index];
    const parts = splitText(`${dream.word} \n\n ${dream.description}`, 4096); // Максимальная длина сообщения в Telegram
    for (const part of parts) {
      await ctx.reply(part);
    }
  }
  await ctx.answerCbQuery(); // Acknowledge the callback query
});

bot.launch().then(() => console.log('Started'));

process.once('SIGINT', () => bot.stop('SIGNIN'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
