import { BotContext } from '../@types/scenes';
import { isAdmin } from '../utils/admin-id.utils';
import { prisma } from '../prisma/prisma.client';

export const shutdownBot = async (ctx: BotContext) => {
    try {
        const userId = ctx.from?.id.toString();
        
        if (!userId || !isAdmin(userId)) {
            await ctx.reply('У вас нет прав для выполнения этой команды');
            return;
        }

        await ctx.reply('Бот выключается...');
        process.exit(0);
    } catch (error) {
        console.error('Error in shutdownBot:', error);
        await ctx.reply('Произошла ошибка при выключении бота');
    }
};

export const startBot = async (ctx: BotContext) => {
    try {
        const userId = ctx.from?.id.toString();
        
        if (!userId || !isAdmin(userId)) {
            await ctx.reply('У вас нет прав для выполнения этой команды');
            return;
        }

        await ctx.reply('Бот запускается...');
        // Здесь можно добавить дополнительную логику запуска
    } catch (error) {
        console.error('Error in startBot:', error);
        await ctx.reply('Произошла ошибка при запуске бота');
    }
}; 