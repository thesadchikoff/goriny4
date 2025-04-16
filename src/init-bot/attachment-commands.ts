import {actCommand} from '@/commands/act.command'
import {getUserInfo} from '@/commands/get-user'
import {getLogsCommand, getLogsGroupCommand} from '@/commands/get-logs.command'
import {bot} from '@/config/bot'
import {versionCommand} from '@/commands/version.command'
import {walletInfo} from '@/commands/wallet'
import {updatesCommand} from '@/commands/updates.command'
import {shutdownCommand} from '@/commands/shutdown.command'
import {startbotCommand} from '@/commands/startbot.command'
import {isBotActive} from '@/utils/bot-state.utils'

// Middleware для проверки состояния бота
bot.use(async (ctx, next) => {
	const active = await isBotActive();
	if (!active) {
		const message = ctx.message as any;
		if (message?.text === '/startbot') {
			await startbotCommand(ctx);
			return;
		}
		await ctx.reply('Бот временно неактивен');
		return;
	}
	await next();
});

export const attachmentCommands = () => {
	bot.command(new RegExp(`^/(.+)$`), getUserInfo)
	bot.command('act', actCommand)
	bot.command('getlogs', getLogsCommand)
	bot.command('getlogsgroup', getLogsGroupCommand)
	// Регистрируем команду версии
	bot.command('version', versionCommand)
	// Регистрируем команду для просмотра кошелька
	walletInfo()
	// Регистрируем команду для работы с обновлениями
	bot.command('updates', updatesCommand)

	// Команды администратора
	bot.command('shutdown', shutdownCommand)
	bot.command('startbot', startbotCommand)

	// Дополнительные логи для диагностики
	bot.on('text', getUserInfo)
}
