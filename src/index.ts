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
import { scheduleLogsDelivery } from '@/commands/get-logs.command';

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
		return
	}
	return
}
export const Stage = attachmentScenes()
Stage.command('start', startCommand)
bot.use(checkBlockMiddleware)
bot.use(session())
// @ts-ignore
bot.use(Stage)
bot.telegram.setMyCommands([
	{
		command: '/start',
		description: 'Запустить бота',
	},
])
attachmentDataBase()
attachmentCommands()
attachmentActions()

// Запускаем задачу ежедневной отправки логов
scheduleLogsDelivery(bot);

callbackHandler()
initConfig()
bot.launch()
bot.catch(error => {
	console.error('TELEGRAF ERROR', error)
})

