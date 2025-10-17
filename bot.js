
const TelegramBot = require('node-telegram-bot-api');

// Получаем токен бота из переменных окружения
const BOT_TOKEN = process.env.BOT_TOKEN;

// Проверка наличия токена
if (!BOT_TOKEN) {
  console.error('❌ ОШИБКА: BOT_TOKEN не установлен в переменных окружения!');
  console.error('Добавьте BOT_TOKEN в Secrets (панель инструментов слева)');
  process.exit(1);
}

// Создаем бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  const welcomeMessage = `🎁 *HypeGift: Коммьюнити подарков Telegram*

Скорее нажимай на Маркет!`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '🛍️ Маркет',
          web_app: { url: 'https://c448cb25-6b5b-497a-af82-22d07d524afe-00-30p7c12rmp4sw.pike.replit.dev/' }
        }
      ]
    ]
  };

  bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
});

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('Бот запущен и ожидает команды /start');
