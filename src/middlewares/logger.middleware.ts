import { Context, MiddlewareFn } from 'telegraf';
import { logInfo, logError } from '@/core/logs/logger';
import { Update } from 'telegraf/typings/core/types/typegram';

/**
 * Middleware для логирования всех входящих сообщений и ошибок
 */
export const loggerMiddleware: MiddlewareFn<Context<Update>> = async (ctx, next) => {
  const startTime = Date.now();
  
  // Получаем информацию о пользователе
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const firstName = ctx.from?.first_name;
  
  // Получаем тип обновления
  let updateType = 'unknown';
  if (ctx.updateType) {
    updateType = ctx.updateType;
  }
  
  // Получаем текст сообщения или данные callback
  let content = '';
  if (ctx.message && 'text' in ctx.message) {
    content = ctx.message.text;
  } else if (ctx.callbackQuery) {
    // Безопасно извлекаем data из callbackQuery
    const callbackData = (ctx.callbackQuery as any).data;
    content = callbackData ? String(callbackData) : 'callback без данных';
  }

  // Собираем метаданные
  const metadata = {
    userId,
    username,
    firstName,
    chatId: ctx.chat?.id,
    chatType: ctx.chat?.type,
    updateType,
    content: content.substring(0, 100) // Обрезаем длину для логирования
  };

  // Логируем входящее сообщение
  logInfo(`📥 Входящее обновление: ${updateType}`, metadata);

  try {
    // Вызываем следующий middleware
    await next();
    
    // Логируем успешное выполнение
    const responseTime = Date.now() - startTime;
    logInfo(`✅ Обработано за ${responseTime}ms`, { 
      ...metadata,
      responseTime
    });
  } catch (error: any) {
    // Логируем ошибку
    const responseTime = Date.now() - startTime;
    logError(`❌ Ошибка при обработке: ${error.message}`, {
      ...metadata,
      responseTime,
      stack: error.stack
    });
    
    // Пробрасываем ошибку дальше
    throw error;
  }
}; 