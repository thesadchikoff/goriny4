import {startCommand} from '@/commands/start.command'
import {session} from 'telegraf'
import {callbackHandler} from './callback-queries/callback-handler'
import {bot} from './config/bot'
import {attachmentActions} from './init-bot/attachment-actions'
import {attachmentCommands} from './init-bot/attachment-commands'
import {attachmentDataBase} from './init-bot/attachment-database'
import {attachmentScenes} from './init-bot/attachment-scenes'
import {prisma} from './prisma/prisma.client'
import {checkBlockMiddleware} from "@/middlewares/check-block.middleware";
import { createBitcoinWallet } from "@/trust-wallet/bitcoin-wallet";
import { BitcoinNetwork } from "@/trust-wallet/bitcoin-balance";
import { scheduleLogsDelivery, scheduleLogsCleanup } from '@/commands/get-logs.command';
import { EditContractDescription } from './scenes/edit-contract-description'
import { ADMIN_ID, initAdmin } from './utils/admin-id.utils';
import { Context } from 'telegraf';
import { loggerMiddleware } from '@/middlewares/logger.middleware';
import { logInfo, logError, logDebug, logErrorWithAutoDetails } from '@/core/logs/logger';
import { BotContext } from '@/@types/scenes';
import { startbotCommand } from '@/commands/startbot.command'
import { startCommandMiddleware } from '@/middlewares/start-command.middleware'
import { logsAccessMiddleware } from '@/middlewares/logs-access.middleware';

// Добавляем обработчики неперехваченных исключений для предотвращения падения приложения
process.on('uncaughtException', (error: Error) => {
	try {
		// Проверяем, не связана ли ошибка с логированием в Telegram
		const errorMessage = error.message || '';
		const isTelegramError = errorMessage.includes('Bad Request') || 
			errorMessage.includes('chat not found') || 
			errorMessage.includes("can't parse entities") ||
			errorMessage.includes('Telegram');
		
		// Если это не ошибка логгера, используем logErrorWithAutoDetails
		if (!isTelegramError) {
			logErrorWithAutoDetails(`Неперехваченное исключение: ${errorMessage}`);
		}
		
		console.error('КРИТИЧЕСКАЯ ОШИБКА (ПЕРЕХВАЧЕНА):', error);
		
		// Отправляем сообщение администратору только для не-телеграм ошибок
		if (!isTelegramError) {
			bot.telegram.sendMessage(
				ADMIN_ID,
				`🚨 КРИТИЧЕСКАЯ ОШИБКА!\n\n${errorMessage}\n\nОшибка перехвачена, бот продолжает работу.`
			).catch(err => {
				console.error('Не удалось отправить сообщение об ошибке админу:', err);
			});
		}
	} catch (handlerError) {
		console.error('Ошибка в обработчике необработанных исключений:', handlerError);
	}
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
	try {
		const errorMessage = reason instanceof Error ? reason.message : String(reason);
		
		// Проверяем, не связана ли ошибка с логированием в Telegram
		const isTelegramError = errorMessage.includes('Bad Request') || 
			errorMessage.includes('chat not found') || 
			errorMessage.includes("can't parse entities") ||
			errorMessage.includes('Telegram');
		
		// Если это не ошибка логгера, используем logErrorWithAutoDetails
		if (!isTelegramError) {
			logErrorWithAutoDetails(`Необработанное обещание: ${errorMessage}`);
		}
		
		console.error('НЕОБРАБОТАННОЕ ОБЕЩАНИЕ (ПЕРЕХВАЧЕНО):', reason);
		
		// Отправляем сообщение администратору только для не-телеграм ошибок
		if (!isTelegramError) {
			bot.telegram.sendMessage(
				ADMIN_ID,
				`⚠️ НЕОБРАБОТАННОЕ ОБЕЩАНИЕ!\n\n${errorMessage}\n\nОшибка перехвачена, бот продолжает работу.`
			).catch(err => {
				console.error('Не удалось отправить сообщение об ошибке админу:', err);
			});
		}
	} catch (handlerError) {
		console.error('Ошибка в обработчике необработанных обещаний:', handlerError);
	}
});

const initConfig = async () => {
	const config = await prisma.config.findFirst()
	if (!config) {
		const adminWallet = createBitcoinWallet(BitcoinNetwork.MAINNET)

		await prisma.config.create({
			data: {
				botName: 'Goryny4Bit',
				feeForTransaction: 0,
				adminWalletAddress: adminWallet.address,
				adminWalletWIF: adminWallet.wif
			},
		})
		logInfo('Создана начальная конфигурация бота', { newConfig: true });
		return
	}
	logDebug('Конфигурация бота загружена', { configExists: true });
	return
}

export const Stage = attachmentScenes()
// Stage.command('start', startCommand)
bot.use(checkBlockMiddleware)
bot.use(session())
// Добавляем middleware логирования
bot.use(loggerMiddleware)

// Добавляем middleware для обработки команды /start в сценах
bot.use(startCommandMiddleware())

// Добавляем middleware для проверки доступа к логам
// bot.use(logsAccessMiddleware())

// @ts-ignore
bot.use(Stage)

bot.telegram.setMyCommands([
	{
		command: '/start',
		description: 'Запустить бота',
	},
	{
		command: '/wallet',
		description: 'Показать баланс кошелька',
	},
	{
		command: '/balance',
		description: 'Показать баланс кошелька (альтернатива)',
	},
	{
		command: '/version',
		description: 'Показать версию бота',
	},
])

attachmentDataBase()
attachmentCommands()
attachmentActions()

// Запускаем задачу ежедневной отправки логов
scheduleLogsDelivery(bot);

// Запускаем задачу еженедельной очистки логов
scheduleLogsCleanup();

callbackHandler()
initConfig()

// Регистрируем сцену редактирования описания контракта
Stage.register(EditContractDescription)

// Запускаем бота
bot.launch().then(async () => {
	// Логируем информацию о настройках логирования
	const telegramLoggingEnabled = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
	logInfo('Статус логирования', {
		telegramLoggingEnabled,
		fileLoggingEnabled: true,
		startTime: new Date().toISOString(),
		adminId: ADMIN_ID,
		nodeEnv: process.env.NODE_ENV || 'development'
	});
	
	// Отправляем сообщение администратору только при запуске
	await bot.telegram.sendMessage(
		ADMIN_ID,
		'🤖 Бот успешно запущен и готов к работе!'
	);
	logInfo('Бот успешно запущен', {
		startTime: new Date().toISOString(),
		adminId: ADMIN_ID,
		nodeEnv: process.env.NODE_ENV || 'development'
	});
}).catch((error: Error) => {
	logError('Ошибка при запуске бота', { error: error.message, stack: error.stack });
	console.error('Ошибка при запуске бота:', error);
});

// Обработка глобальных ошибок Telegraf
bot.catch(error => {
	console.error('TELEGRAF ERROR', error)
})

