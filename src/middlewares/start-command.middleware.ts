import { Middleware, Context } from 'telegraf';
import { logInfo } from '@/core/logs/logger';
import { Update } from 'telegraf/typings/core/types/typegram';

/**
 * Middleware для обработки только команды /start в сценах
 * Позволяет выйти из любой сцены при вводе команды /start
 */
export const startCommandMiddleware = (): Middleware<Context<Update>> => {
	return async (ctx, next) => {
		// Проверяем, является ли сообщение командой /start
		if (ctx.message && 'text' in ctx.message && ctx.message.text === '/start') {
			logInfo('Пользователь использовал команду /start', {
				userId: ctx.from?.id,
				username: ctx.from?.username
			});
			
			// Проверяем, находится ли пользователь в сцене
			const isInScene = (ctx as any).session?.__scenes?.current;
			
			if (isInScene) {
				await ctx.reply('Выход из текущей операции. Возвращаемся в главное меню.');
				
				try {
					// Пытаемся безопасно выйти из сцены
					if ((ctx as any).scene && typeof (ctx as any).scene.leave === 'function') {
						await (ctx as any).scene.leave();
						return; // Завершаем обработку, чтобы не выполнять стандартную команду /start
					}
				} catch (error) {
					logInfo('Ошибка при выходе из сцены', { 
						error: String(error),
						sceneName: (ctx as any).session?.__scenes?.current 
					});
				}
			}
		}
		
		// Продолжаем стандартную обработку
		return next();
	};
}; 