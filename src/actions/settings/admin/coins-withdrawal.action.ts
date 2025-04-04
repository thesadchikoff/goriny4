import { BotContext } from '@/@types/scenes'
import configService from '@/db/config.service'
import userService from '@/db/user.service'
import { createTransaction, sendTransaction } from '@/trust-wallet/1'
import { Wallet } from '@prisma/client'

let isProcessRunning = false // Флаг состояния процесса

export const coinsWithdrawalAction = async (ctx: BotContext) => {
	if (isProcessRunning) {
		// Если процесс уже в работе, уведомляем пользователя
		await ctx.reply(
			'Процесс уже в работе. Пожалуйста, дождитесь его завершения.'
		)
		return
	}

	// Устанавливаем флаг процесса в "работает"
	isProcessRunning = true

	// Отправляем начальное сообщение и сохраняем message_id
	const initialMessage = await ctx.reply(
		'Задача на пополнение мастер-кошелька создана и находится в процессе…\n\nВы можете продолжать пользоваться ботом далее. По завершению процесса Вам поступит уведомление о статусе её завершения.'
	)
	const userWallets = await userService.userWallets()
	const masterWallet = await configService.adminWallet()

	startBackgroundTask(
		ctx,
		initialMessage.message_id,
		userWallets,
		masterWallet.adminWalletAddress!
	)
}

const startBackgroundTask = async (
	ctx: BotContext,
	messageId: number,
	wallets: Wallet[],
	masterAddress: string
) => {
	try {
		for (const wallet of wallets) {
			// Задержка перед обработкой следующего кошелька
			await createTransaction(
				wallet.wif,
				Number(wallet.balance),
				masterAddress,
				0
			).then(txHash => sendTransaction(txHash))

			// Редактируем сообщение
			await ctx.telegram.editMessageText(
				ctx.chat!.id,
				messageId,
				undefined, // inline_message_id, если редактируется инлайн сообщение
				`Перевод с кошелька ${wallet.address} произведен`
			)
		}

		// Финальное сообщение
		await ctx.telegram.editMessageText(
			ctx.chat!.id,
			messageId,
			undefined,
			'Все средства переведены на мастер кошелек'
		)
	} catch (err) {
		console.error('Ошибка в процессе перевода:', err)

		// Уведомляем пользователя о сбое
		await ctx.telegram.editMessageText(
			ctx.chat!.id,
			messageId,
			undefined,
			'Произошла ошибка при переводе средств.'
		)
	} finally {
		// Сбрасываем флаг после завершения процесса
		isProcessRunning = false
	}
}
