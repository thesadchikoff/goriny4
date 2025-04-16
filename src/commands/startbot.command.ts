import { Context } from 'telegraf'
import { isAdmin } from '@/utils/admin-id.utils'
import { setBotActive } from '@/utils/bot-state.utils'

export const startbotCommand = async (ctx: Context) => {
    const userId = ctx.from?.id.toString();
    if (!userId || !isAdmin(userId)) {
        await ctx.reply('У вас нет прав для выполнения этой команды');
        return;
    }
    await setBotActive(true);
    await ctx.reply('Бот успешно активирован!');
}; 