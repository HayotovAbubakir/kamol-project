/**
 * KAMOL PROJECT — Telegram Bot
 *
 * Sozlash:
 * 1. @BotFather dan bot yarating va token oling
 * 2. .env fayl yarating: TELEGRAM_BOT_TOKEN=your_token
 * 3. npm run bot
 *
 * Buyruqlar:
 * /start — Boshlash
 * /status — Barcha ishchilar holati (admin)
 * /my — Mening loyihalarim (ishchi)
 * /help — Yordam
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = process.env.API_BASE || 'http://localhost:4028';

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN o\'rnatilmagan!');
  console.log('   .env fayl yarating: TELEGRAM_BOT_TOKEN=your_token_here');
  process.exit(1);
}

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function tg(method, body) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function getSummary() {
  const res = await fetch(`${API_BASE}/api/telegram`);
  if (!res.ok) throw new Error('API bilan bog\'lanib bo\'lmadi');
  return res.json();
}

function formatWorkerStatus(worker) {
  let text = `👷 *${worker.worker}*\n`;
  text += `📊 Faol: ${worker.activeCount} | Tugallangan: ${worker.completedCount}\n\n`;

  if (worker.activeProjects.length > 0) {
    text += '*Faol loyihalar:*\n';
    worker.activeProjects.forEach((p, i) => {
      const icon = p.urgency === 'red' ? '🔴' : p.urgency === 'yellow' ? '🟡' : '🟢';
      text += `${i + 1}. ${icon} ${p.title}\n`;
      text += `   📍 ${p.address}\n`;
      text += `   📅 ${p.orderDate} | ${p.status}\n\n`;
    });
  }

  if (worker.recentCompleted.length > 0) {
    text += '*So\'nggi tugallangan:*\n';
    worker.recentCompleted.forEach((p) => {
      text += `✅ ${p.title} — ${p.address} (${p.completedAt})\n`;
    });
  }

  return text;
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() ?? '';

  if (text === '/start') {
    await tg('sendMessage', {
      chat_id: chatId,
      text: '🏗 *KAMOL PROJECT Bot*\n\nArxitektura loyihalarini kuzatish uchun bot.\n\n/help — buyruqlar ro\'yxati',
      parse_mode: 'Markdown',
    });
    return;
  }

  if (text === '/help') {
    await tg('sendMessage', {
      chat_id: chatId,
      text: '📋 *Buyruqlar:*\n\n/status — Barcha ishchilar holati\n/my — Mening loyihalarim\n/help — Yordam',
      parse_mode: 'Markdown',
    });
    return;
  }

  if (text === '/status') {
    try {
      const data = await getSummary();
      let response = `📊 *KAMOL PROJECT — Umumiy holat*\n`;
      response += `Jami loyihalar: ${data.totalProjects}\n\n`;

      for (const worker of data.summary) {
        response += formatWorkerStatus(worker) + '\n---\n\n';
      }

      await tg('sendMessage', {
        chat_id: chatId,
        text: response.slice(0, 4000),
        parse_mode: 'Markdown',
      });
    } catch {
      await tg('sendMessage', {
        chat_id: chatId,
        text: '❌ Ma\'lumotlarni olishda xatolik. Sayt ishlayaptimi?',
      });
    }
    return;
  }

  if (text === '/my') {
    try {
      const data = await getSummary();
      const telegramId = String(chatId);
      const worker = data.summary.find((w) => w.telegramId === telegramId);

      if (!worker) {
        await tg('sendMessage', {
          chat_id: chatId,
          text: '⚠️ Sizning Telegram ID tizimda ro\'yxatdan o\'tmagan.\nAdmin bilan bog\'laning.',
        });
        return;
      }

      await tg('sendMessage', {
        chat_id: chatId,
        text: formatWorkerStatus(worker),
        parse_mode: 'Markdown',
      });
    } catch {
      await tg('sendMessage', {
        chat_id: chatId,
        text: '❌ Ma\'lumotlarni olishda xatolik.',
      });
    }
    return;
  }

  await tg('sendMessage', {
    chat_id: chatId,
    text: 'Noma\'lum buyruq. /help yozing.',
  });
}

async function poll() {
  let offset = 0;
  console.log('🤖 KAMOL PROJECT Telegram bot ishga tushdi...');
  console.log(`   API: ${API_BASE}`);

  while (true) {
    try {
      const data = await tg('getUpdates', { offset, timeout: 30 });

      if (data.ok && data.result) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          if (update.message) {
            await handleMessage(update.message);
          }
        }
      }
    } catch (err) {
      console.error('Polling xatolik:', err.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

poll();
