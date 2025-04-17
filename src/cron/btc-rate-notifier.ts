import { bot } from '@/config/bot';
import { prisma } from '@/prisma/prisma.client';
import currencyService from '@/service/currency.service';
import { config } from '@/config/service.config';
import cron from 'node-cron';
import { logInfo, logError, logDebug } from '@/core/logs/logger';
import axios from 'axios';
import { url } from '@/config/api';

// Прямой вызов для проверки доступности API CoinGecko
axios.get(url + '?ids=bitcoin&vs_currencies=usd')
  .then(response => {
    console.log('🟢 API CoinGecko доступен:', response.data);
  })
  .catch(error => {
    console.error('🔴 Ошибка при обращении к API CoinGecko:', error.message);
  });

// Настройки службы уведомлений
const NOTIFICATION_CONFIG = {
  // Порог изменения курса в процентах, при котором отправляются уведомления
  CHANGE_THRESHOLD: 0.0005, // 0.5% - более разумный порог для уведомлений
  // Интервал проверки курса в формате cron (по умолчанию каждые 30 минут, чтобы не превышать лимиты API)
  CHECK_INTERVAL: '*/30 * * * *',
  // Валюта для отслеживания курса BTC
  CURRENCY: 'usd' as const,
  // Минимальный интервал между уведомлениями в минутах
  MIN_NOTIFICATION_INTERVAL: 15,
  // Счетчик повторных попыток при ошибке API
  MAX_RETRY_COUNT: 3,
  // Задержка между повторными попытками в миллисекундах
  RETRY_DELAY: 2000
};

// Последний известный курс BTC
let lastBTCRate: number | null = null;
// Время последней отправки уведомления
let lastNotificationTime: Date | null = null;

/**
 * Получает курс BTC с поддержкой повторных попыток при ошибках
 */
async function getBTCRateWithRetry(): Promise<number | null> {
  let retryCount = 0;
  
  while (retryCount < NOTIFICATION_CONFIG.MAX_RETRY_COUNT) {
    try {
      const rate = await currencyService.getCurrentBTCRate(NOTIFICATION_CONFIG.CURRENCY);
      return rate;
    } catch (error) {
      retryCount++;
      const isRateLimitError = error instanceof Error && 
        (error.message.includes('429') || error.message.includes('rate limit'));
      
      if (isRateLimitError) {
        logError(`Превышен лимит запросов к API CoinGecko (429). Попытка ${retryCount}/${NOTIFICATION_CONFIG.MAX_RETRY_COUNT}`);
      } else {
        logError(`Ошибка при получении курса BTC: ${(error as Error).message}. Попытка ${retryCount}/${NOTIFICATION_CONFIG.MAX_RETRY_COUNT}`);
      }
      
      if (retryCount >= NOTIFICATION_CONFIG.MAX_RETRY_COUNT) {
        return null;
      }
      
      // Ждем перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, NOTIFICATION_CONFIG.RETRY_DELAY));
    }
  }
  
  return null;
}

/**
 * Отправляет уведомления пользователям о изменении курса BTC
 */
export async function notifyBTCRateChanges() {
  try {
    // Получаем текущий курс BTC в выбранной валюте с поддержкой повторных попыток
    const currentRate = await getBTCRateWithRetry();
    
    // Если курс не удалось получить, прекращаем выполнение
    if (currentRate === null) {
      logError('Не удалось получить курс BTC после нескольких попыток');
      return;
    }
    
    logDebug(`Текущий курс BTC: $${currentRate.toFixed(2)}`);
    
    // Если это первый запуск (lastBTCRate === null), просто сохраняем текущий курс
    if (lastBTCRate === null) {
      lastBTCRate = currentRate;
      logInfo(`Начальный курс BTC: $${currentRate.toFixed(2)}`);
      
      // Проверяем количество подписчиков
      const subscriberCount = await prisma.user.count({
        where: {
          isBtcSubscribed: true,
          isBlocked: false
        }
      });
      logInfo(`Всего подписчиков на уведомления о курсе BTC: ${subscriberCount}`);
      
      return;
    }
    
    // Вычисляем процент изменения
    const changePercent = ((currentRate - lastBTCRate) / lastBTCRate) * 100;
    logDebug(`Изменение курса BTC: ${changePercent.toFixed(4)}% (предыдущий: $${lastBTCRate.toFixed(2)}, текущий: $${currentRate.toFixed(2)})`);
    
    // Проверяем, прошло ли достаточно времени с момента последнего уведомления
    const now = new Date();
    if (lastNotificationTime !== null) {
      const minutesSinceLastNotification = (now.getTime() - lastNotificationTime.getTime()) / (1000 * 60);
      
      if (minutesSinceLastNotification < NOTIFICATION_CONFIG.MIN_NOTIFICATION_INTERVAL) {
        logDebug(`Слишком рано для нового уведомления. Прошло ${minutesSinceLastNotification.toFixed(1)} мин. из ${NOTIFICATION_CONFIG.MIN_NOTIFICATION_INTERVAL} мин.`);
        
        // Обновляем последний известный курс
        lastBTCRate = currentRate;
        return;
      }
    }
    
    // Проверяем, достаточно ли изменился курс для отправки уведомлений
    if (Math.abs(changePercent) < NOTIFICATION_CONFIG.CHANGE_THRESHOLD) {
      logDebug(`Изменение курса BTC (${changePercent.toFixed(4)}%) меньше порога уведомления (${NOTIFICATION_CONFIG.CHANGE_THRESHOLD}%)`);
      
      // Обновляем последний известный курс
      lastBTCRate = currentRate;
      return;
    }
    
    // Определяем, растет или падает курс
    const trend = changePercent > 0 ? '📈 растет' : '📉 падает';
    const emoji = changePercent > 0 ? '🟢' : '🔴';
    
    // Получаем всех подписанных пользователей
    const subscribedUsers = await prisma.user.findMany({
      where: {
        isBtcSubscribed: true,
        isBlocked: false
      },
      select: {
        id: true,
        username: true
      }
    });
    
    logInfo(`Отправка уведомлений ${subscribedUsers.length} пользователям об изменении курса BTC (${changePercent.toFixed(4)}%)`);
    
    // Отправляем уведомления каждому подписанному пользователю
    let sentCount = 0;
    let errorCount = 0;
    
    for (const user of subscribedUsers) {
      try {
        await bot.telegram.sendMessage(
          user.id,
          `${emoji} <b>Изменение курса BTC</b>\n\n` +
          `Курс BTC ${trend} и сейчас составляет <b>$${currentRate.toFixed(2)}</b>\n` +
          `Изменение: <b>${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%</b>\n\n` +
          `Предыдущий курс: <b>$${lastBTCRate.toFixed(2)}</b>`,
          {
            parse_mode: 'HTML'
          }
        );
        sentCount++;
      } catch (error) {
        errorCount++;
        logError(`Не удалось отправить уведомление пользователю ${user.id} (${user.username || 'без имени'}): ${(error as Error).message}`);
      }
    }
    
    logInfo(`Уведомления отправлены: ${sentCount} успешно, ${errorCount} с ошибками`);
    
    // Обновляем последний известный курс
    lastBTCRate = currentRate;
    lastNotificationTime = now;
    
  } catch (error) {
    logError(`Ошибка в службе уведомлений о курсе BTC: ${(error as Error).message}`);
  }
}

/**
 * Запускает задачу по расписанию для проверки изменения курса BTC
 */
export function startBTCRateNotifier() {
  // Отправляем тестовое уведомление всем администраторам для проверки работы службы
  sendTestBTCNotification();
  
  // Запускаем проверку по заданному расписанию
  const job = cron.schedule(NOTIFICATION_CONFIG.CHECK_INTERVAL, async () => {
    logDebug('[BTC_RATE_NOTIFIER] Проверка изменений курса BTC...');
    await notifyBTCRateChanges();
  });
  
  // Принудительно запускаем задачу немедленно
  job.start();
  
  // Запускаем первую проверку сразу
  notifyBTCRateChanges();
  
  logInfo(`[BTC_RATE_NOTIFIER] Служба уведомлений о курсе BTC запущена. Интервал проверки: ${NOTIFICATION_CONFIG.CHECK_INTERVAL}, порог уведомления: ${NOTIFICATION_CONFIG.CHANGE_THRESHOLD}%`);
}

/**
 * Отправляет тестовое уведомление администраторам для проверки работы службы
 */
async function sendTestBTCNotification() {
  try {
    // Получаем текущий курс BTC
    const currentRate = await currencyService.getCurrentBTCRate('usd');
    if (currentRate === null) {
      logError('Не удалось получить курс BTC для тестового уведомления');
      return;
    }
    
    // Получаем всех администраторов
    const admins = await prisma.user.findMany({
      where: {
        isAdmin: true,
        isBlocked: false
      },
      select: {
        id: true,
        username: true
      }
    });
    
    logInfo(`Отправка тестового уведомления ${admins.length} администраторам`);
    
    // Отправляем уведомления каждому администратору
    for (const admin of admins) {
      try {
        await bot.telegram.sendMessage(
          admin.id,
          `🔔 <b>Тестовое уведомление службы курса BTC</b>\n\n` +
          `Текущий курс BTC: <b>$${currentRate.toFixed(2)}</b>\n\n` +
          `Это сообщение подтверждает, что служба уведомлений об изменении курса BTC работает корректно.\n` +
          `Порог уведомления установлен на <b>${NOTIFICATION_CONFIG.CHANGE_THRESHOLD}%</b>.\n` +
          `Интервал проверки: <b>${NOTIFICATION_CONFIG.CHECK_INTERVAL}</b>`,
          {
            parse_mode: 'HTML'
          }
        );
        logInfo(`Тестовое уведомление успешно отправлено администратору ${admin.id} (${admin.username || 'без имени'})`);
      } catch (error) {
        logError(`Не удалось отправить тестовое уведомление администратору ${admin.id}: ${(error as Error).message}`);
      }
    }
  } catch (error) {
    logError(`Ошибка при отправке тестового уведомления: ${(error as Error).message}`);
  }
}

/**
 * Функция для проверки доступа к API и отправки немедленного уведомления 
 * администраторам без ожидания cron задачи
 */
async function testBTCRateNotifier() {
  try {
    console.log('⏱️ Запуск ручного теста уведомлений...');
    
    // Получаем текущий курс напрямую, не используя сервис
    const response = await axios.get(url + '?ids=bitcoin&vs_currencies=usd');
    console.log('📊 Данные от API:', response.data);
    
    // Проверяем структуру ответа с помощью безопасных проверок
    const responseData = response.data as any;
    if (!responseData || 
        typeof responseData !== 'object' || 
        !responseData.bitcoin || 
        typeof responseData.bitcoin.usd !== 'number') {
      console.error('❌ Некорректные данные от API:', responseData);
      return;
    }
    
    // Явно приводим тип данных ответа
    const data = response.data as { bitcoin: { usd: number } };
    const currentRate = data.bitcoin.usd;
    console.log(`💰 Текущий курс BTC: $${currentRate}`);
    
    if (!currentRate) {
      console.error('❌ Не удалось получить курс BTC напрямую');
      return;
    }
    
    // Получаем администраторов
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: { id: true, username: true }
    });
    
    console.log(`👥 Администраторы для уведомления:`, admins);
    
    // Отправляем тестовое сообщение каждому админу
    for (const admin of admins) {
      try {
        await bot.telegram.sendMessage(
          admin.id,
          `🧪 <b>ТЕСТОВОЕ УВЕДОМЛЕНИЕ (немедленная отправка)</b>\n\n` +
          `Текущий курс BTC: <b>$${currentRate}</b>\n\n` +
          `Это сообщение отправлено вручную в ${new Date().toLocaleTimeString()} для проверки работы системы уведомлений.`,
          { parse_mode: 'HTML' }
        );
        console.log(`✅ Тестовое сообщение отправлено администратору ${admin.id} (${admin.username || 'без имени'})`);
      } catch (error) {
        console.error(`❌ Ошибка при отправке тестового сообщения администратору ${admin.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении теста:', error);
  }
}

// Запускаем тест немедленно, без ожидания cron
// console.log('🚀 Запускаем немедленный тест уведомлений...');
// testBTCRateNotifier(); 