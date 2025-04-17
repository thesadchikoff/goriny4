import { Context, Middleware } from 'telegraf';
import { logInfo } from '@/core/logs/logger';
import { prisma } from '@/prisma/prisma.client';
import { Update } from 'telegraf/typings/core/types/typegram';

/**
 * Middleware для проверки доступа к командам логов
 * Разрешает доступ только администраторам
 */
export const logsAccessMiddleware = (): Middleware<Context<Update>> => {
  // Список разрешенных команд логов
  const LOG_COMMANDS = ['/getlogs', '/getlog', '/getlogslist', '/getlogsgroup', '/cleanuplogs'];
  
  return async (ctx, next) => {
    // Проверяем, является ли сообщение командой логов
    if (ctx.message && 'text' in ctx.message && LOG_COMMANDS.includes(ctx.message.text.split(' ')[0])) {
      logInfo(`Получен запрос на доступ к логам: ${ctx.message.text}`, {
        userId: ctx.from?.id,
        username: ctx.from?.username
      });
      
      // Проверяем, является ли пользователь администратором
      const user = await prisma.user.findFirst({
        where: {
          id: String(ctx.from?.id)
        }
      });
      
      // Если пользователь администратор, разрешаем доступ
      if (user && user.isAdmin) {
        logInfo(`Пользователь [ID: ${ctx.from?.id} | USERNAME: ${ctx.from?.username}] запросил логи`, {
          userId: ctx.from?.id,
          command: ctx.message.text
        });
        
        // Продолжаем обработку
        return next();
      }
      
      // Если пользователь не администратор, отказываем в доступе
      await ctx.reply('🚫 У вас нет прав для использования этой команды');
      return; // Прерываем цепочку middleware
    }
    
    // Если это не команда логов, продолжаем стандартную обработку
    return next();
  };
}; 