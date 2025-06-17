import {generateUrlForUser} from '@/utils/generate-user-url'
import {Scenes} from 'telegraf'
import {InlineKeyboardButton} from 'telegraf/typings/core/types/typegram'
import {WizardContext} from 'telegraf/typings/scenes'
import {prisma} from '../prisma/prisma.client'
import {currencyFormatter} from '../utils/currency-formatter'
import disputeModule from "@/core/dispute/dispute.module";

const writeMessage = async (ctx: WizardContext) => {
	try {
		await ctx.reply('Напишите сообщение, которое хотите отправить:')
		return ctx.wizard.next()
	} catch (error) {
		console.error('Error in writeMessage:', error)
		await ctx.reply('❗️ Произошла ошибка при попытке начать диалог.')
		return ctx.scene.leave()
	}
}

const sendingMessage = async (ctx: WizardContext) => {
	try {
		// @ts-ignore
		const userId = ctx.from?.id.toString()

		if (!userId) throw new Error('User ID not found in wizard state')

		const contract = await prisma.contractTransaction.findFirst({
			where: {
				OR: [
					{
						buyerId: userId,
					},
					{
						sellerId: userId,
					},
				],
			},
			include: {
				buyer: true,
				seller: true,
				contract: true,
			},
		})

		if (!contract?.id || !contract.buyerId || !contract.sellerId) {
			await ctx.reply('❗️ Пользователь или контракт не найден.')
			return ctx.scene.leave()
		}

		const { sellerId, buyerId } = contract

		// Сохраняем sellerId и buyerId в state
		// @ts-ignore
		ctx.session.sellerId = sellerId
		// @ts-ignore
		ctx.session.buyerId = buyerId

		const activeSellerId = ctx.session.sellerId
		const activeBuyerId = ctx.session.buyerId

		const currentTradeContract = await prisma.contractTransaction.findFirst({
			where: {
				OR: [
					{ sellerId: String(ctx.from?.id) },
					{ buyerId: String(ctx.from?.id) },
				],
			},
			include: { buyer: true, seller: true },
		})

		if (!currentTradeContract) {
			await ctx.reply('❗️ Сделка не найдена.')
			return ctx.scene.leave()
		}

		const inlineButtons: InlineKeyboardButton[][] = [
			[
				{
					callback_data: `send-message-${activeSellerId}`,
					text: '💬 Ответить',
				},
			],
		]

		const isBuyer = contract.buyerId === ctx.from!.id.toString()
		if (contract.contract.type === 'buy') {
			ctx.session.tradeAction = 'buy'
			inlineButtons[0].push({
				callback_data: isBuyer
					? `payment-contract-${contract.id}`
					: `payment-successful-${contract.id}`,
				text: isBuyer ? '✅ Я оплатил' : '✅ Деньги получены',
			})
		} else {
			ctx.session.tradeAction = 'sell'
			inlineButtons[0].push({
				callback_data: isBuyer
					? `payment-successful-${contract.id}`
					: `payment-contract-${contract.id}`,
				text: isBuyer ? '✅ Деньги получены' : '✅ Я оплатил',
			})
		}
		const openDisputeButton = isBuyer ? disputeModule.getDisputeButton('open') : []
		// Отправка сообщения другому пользователю
		const recipientId =
			currentTradeContract.sellerId === ctx.from!.id.toString()
				? currentTradeContract.buyerId
				: currentTradeContract.sellerId

		await ctx.telegram.sendMessage(
			recipientId!,
			`💬 Сообщение от ${
				currentTradeContract.sellerId === ctx.from!.id.toString()
					? 'трейдера'
					: 'покупателя'
			} /${
				currentTradeContract.sellerId === ctx.from!.id.toString()
					? currentTradeContract.seller!.login
					: currentTradeContract.buyer!.login
			}\nСделка #${
				currentTradeContract.code
			}\n\nМинимальная сумма - ${currencyFormatter(
				contract.contract.price!,
				contract.contract.currency!
			)}\nМаксимальная сумма - ${currencyFormatter(
				contract.contract.maxPrice!,
				contract.contract.currency!
			)}\nСтатус сделки: Ожидает оплаты\n\n---------------------------\n${
				ctx.text || 'Сообщение не может быть пустым'
			}\n---------------------------\n❗️Администрация не имеет отношения к содержимому сообщения!`,
			{
				parse_mode: 'HTML',
				reply_markup: { inline_keyboard: [...inlineButtons, openDisputeButton] },
			}
		)
		const userUrl = generateUrlForUser(
			isBuyer ? contract.buyer!.login! : contract.seller!.login!
		)
		// Подтверждение отправки
		await ctx.reply(
			`✅ Сообщение пользователю <a href="${userUrl}">${
				isBuyer ? contract.buyer?.login : contract.seller?.login
			}</a> успешно доставлено.`,
			{
				parse_mode: 'HTML',
			}
		)
		return ctx.scene.leave()
	} catch (error) {
		console.error('Error in sendingMessage:', error)
		await ctx.reply('❗️ Произошла ошибка при отправке сообщения.')
		return ctx.scene.leave()
	}
}

export const SendMessage = new Scenes.WizardScene<WizardContext>(
	'send_message',
	writeMessage,
	sendingMessage
)
