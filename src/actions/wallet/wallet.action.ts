import {config} from '@/config/service.config'
import {previousButton} from '@/keyboards/inline-keyboards/previous-button.inline'
import {walletInlineKeyboard} from '@/keyboards/inline-keyboards/wallet.inline'
import {prisma} from '@/prisma/prisma.client'
import currencyService from '@/service/currency.service'
import {createWallet} from '@/trust-wallet/create-wallet'
import {currencyFormatter} from '@/utils/currency-formatter'
import {generateUrlForUser} from '@/utils/generate-user-url'
import {totalDays} from '@/utils/total-days'
import {Scenes} from 'telegraf'
import {WizardContext} from 'telegraf/typings/scenes'

export const walletAction = async (
	ctx: WizardContext<Scenes.WizardSessionData>
) => {
	try {
		const user = await prisma.user.findFirst({
			where: {
				id: String(ctx.from?.id),
			},
			include: {
				wallet: true
			}
		})
		const diffInDays = totalDays(user?.createdAt)
		const wallet = await createWallet(ctx.from!.id)
		const convertToRuble = await currencyService.convertRubleToBTC(wallet?.balance)
        const contractTransactions = await prisma.contractTransaction.findMany({
			where: {
				sellerId: ctx.from!.id.toString(),
			},
		})
		if (!wallet) {
			const userWallet = await prisma.user.findFirst({
				where: {
					id: ctx.from!.id.toString(),
				},
				include: {
					wallet: true,
				},
			})
			if (userWallet && userWallet.wallet) {
				const convertToRuble = await currencyService.convertRubleToBTC(userWallet.wallet.balance)
                const userUrl = generateUrlForUser(user?.login!)
				return ctx.editMessageText(
					`🏦 <b>${
						config.shopName
					}</b>\n\n<b>Ваш баланс:</b> ${user!.wallet!.balance!.toFixed(6)} BTC ≈ ${currencyFormatter(
						Number(convertToRuble),
						'RUB'
					)}\n\n<b>Вы пополнили:</b> ${
						user?.totalAmountAdd
					} BTC\n<b>Вы вывели:</b> ${
						user?.totalAmountReplenish
					} BTC\n\n<b>Ваш уникальный никнейм:</b> <a href="${userUrl}">${
						user?.login
					}</a>\n\n<b>Отзывы о вас:</b> (0)👍 (0)👎\n\n<b>Дней в нашем сервисе:</b> ${diffInDays}\n<b>Вы совершили удачных сделок:</b> ${
						contractTransactions.length
					} на сумму ${contractTransactions.reduce(
						(currentSum, currentTransaction) =>
							currentSum + currentTransaction.amount,
						0
					)} BTC\n<b>Вы защищены нашим сервисом от взлома и кражи ваших BTC.</b>`,
					{
						parse_mode: 'HTML',

						reply_markup: {
							inline_keyboard: [
								...walletInlineKeyboard,
								[
									...previousButton('main_menu'),
									{
										callback_data: 'history_transfer',
										text: '⏱️ История переводов',
									},
								],
							],
						},
					}
				)
			}
			return ctx.editMessageText('У Вас уже создан кошелек', {
				parse_mode: 'Markdown',
				reply_markup: {
					inline_keyboard: [previousButton('main_menu')],
				},
			})
		}
		const userUrl = generateUrlForUser(user?.login!)
		return ctx.editMessageText(
			`🏦 <b>${
				config.shopName
			}</b>\n\n<b>Ваш баланс:</b> ${wallet.balance} BTC ≈ ${convertToRuble} RUB\n\n<b>Вы пополнили:</b> ${
				user?.totalAmountAdd
			} BTC\n<b>Вы вывели:</b> ${
				user?.totalAmountReplenish
			} BTC\n\n<b>Ваш уникальный никнейм:</b> <a href="${userUrl}">${
				user?.login
			}</a>\n\n<b>Отзывы о вас:</b> (0)👍 (0)👎\n\n<b>Дней в нашем сервисе:</b> ${diffInDays}\n<b>Вы совершили удачных сделок:</b> ${
				contractTransactions.length
			} на сумму ${contractTransactions.reduce(
				(currentSum, currentTransaction) =>
					currentSum + currentTransaction.amount,
				0
			)} BTC\n<b>Вы защищены нашим сервисом от взлома и кражи ваших BTC.</b>`,
			{
				parse_mode: 'HTML',

				reply_markup: {
					inline_keyboard: [
						...walletInlineKeyboard,
						[
							...previousButton('main_menu'),
							{
								callback_data: 'history_transfer',
								text: '⏱️ История переводов',
							},
						],
					],
				},
			}
		)
	} catch (error) {
		return ctx.reply(String(error))
	}
}
