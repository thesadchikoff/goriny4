import {actCommand} from '@/commands/act.command'
import {getUserInfo} from '@/commands/get-user'
import {getLogsCommand, getLogsGroupCommand, getLogsListCommand, getSpecificLogCommand, cleanupLogsCommand} from '@/commands/get-logs.command'
import {bot} from '@/config/bot'
import {versionCommand} from '@/commands/version.command'
import {walletInfo} from '@/commands/wallet'
import {updatesCommand} from '@/commands/updates.command'
import {shutdownCommand} from '@/commands/shutdown.command'
import {startbotCommand} from '@/commands/startbot.command'
import {isBotActive} from '@/utils/bot-state.utils'
import {starsPaymentCommand} from '@/commands/stars-payment.command'
import {testStarsPaymentCommand} from '@/commands/test-stars-payment.command'
import {balanceCommand} from '@/commands/balance.command'
import {startCommand} from '@/commands/start.command'
import { Stage } from '@/index'
import { profileCommand } from '@/commands/get-profile'
import {addCoins} from "@/commands/add-coins";

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
	// Регистрируем общие команды
	Stage.command('start', startCommand)
	Stage.command('act', actCommand)
	Stage.command('getlogs', getLogsCommand)
	Stage.command('getlogsgroup', getLogsGroupCommand)
	// Добавляем новые команды для работы с логами
	Stage.command('getlogslist', getLogsListCommand)
	Stage.command('getlog', getSpecificLogCommand)
	Stage.command('cleanuplogs', cleanupLogsCommand)
	// Регистрируем команду версии
	Stage.command('version', versionCommand)
	// Регистрируем команду для просмотра кошелька
	walletInfo()
	// Регистрируем команду для работы с обновлениями
	Stage.command('updates', updatesCommand)
	// Регистрируем команду для оплаты звездами
	Stage.command('stars', starsPaymentCommand)
	// Регистрируем команду для тестирования платежей
	Stage.command('teststars', testStarsPaymentCommand)
	// Регистрируем команду для просмотра баланса
	Stage.command('balance', balanceCommand)

	// Команды администратора
	Stage.command('shutdown', shutdownCommand)
	Stage.command('startbot', startbotCommand)

	// Регистрируем обработчик для необработанных команд
	Stage.command(new RegExp(`^/(.+)$`), getUserInfo)

	// Команда для выдачи тестовых монет
	Stage.command('coins', addCoins)
	
	// Дополнительные логи для диагностики
	bot.on('text', async (ctx) => {
		try {
			await getUserInfo(ctx);
		} catch (error) {
			console.error('Ошибка при логировании сообщения:', error);
		}
	});

	// Регистрируем команду профиля
	profileCommand()
}
