import { Networks } from 'bitcore-lib'
import { Scenes } from 'telegraf'
import { WizardContext } from 'telegraf/typings/scenes'
import { prisma } from '../prisma/prisma.client'
import { sendCoin } from '../trust-wallet/send-coin'
import { addBalance, deductBalance } from '../utils/balance.utils'

const writePromoCode = async (ctx: WizardContext) => {
	try {
		ctx.reply('🎫 Укажите промокод для активации')
		return ctx.wizard.next()
	} catch (error) {
		console.log(error)
		ctx.scene.leave()
		return ctx.reply('❗️ Произошла непредвиденная ошибка')
	}
}

const findPromoCodeAndActivation = async (ctx: WizardContext) => {
	try {
		const code = await prisma.code.findFirst({
			where: {
				code: ctx.text?.toUpperCase(),
			},
		})

		if (!code) {
			ctx.reply(
				`🚫 <b>Промокод не найден</b>\n\nВозможно такого промокода не существует или вы указали его некорректно`,
				{
					reply_markup: {
						inline_keyboard: [
							[
								{
									callback_data: 'activate_code',
									text: '🔁 Повторить',
								},
							],
						],
					},
					parse_mode: 'HTML',
				}
			)
			ctx.scene.leave()
		} else {
			const selfUser = await prisma.user.findFirst({
				where: {
					id: ctx.from?.id.toString(),
				},
				include: {
					wallet: true,
				},
			})

			if (!selfUser || !selfUser.wallet) {
				throw new Error('Пользователь или кошелек не найден')
			}

			// Проверяем, не пытается ли пользователь активировать свой промокод
			if (code.creatorId === selfUser.id) {
				ctx.reply(
					`🚫 <b>Ошибка активации</b>\n\nВы не можете активировать свой собственный промокод`,
					{
						reply_markup: {
							inline_keyboard: [
								[
									{
										callback_data: 'activate_code',
										text: '🔁 Повторить',
									},
								],
							],
						},
						parse_mode: 'HTML',
					}
				)
				return ctx.scene.leave()
			}

			// Получаем создателя промокода
			const creator = await prisma.user.findUnique({
				where: { id: code.creatorId! },
				include: { wallet: true }
			})

			if (!creator || !creator.wallet) {
				throw new Error('Создатель промокода или его кошелек не найден')
			}

			// Списываем баланс у создателя промокода
			await deductBalance(creator.id, code.amountCoins)

			// Начисляем баланс активирующему
			await addBalance(selfUser.id, code.amountCoins)
			
			await prisma.code.delete({
				where: {
					id: code.id,
				},
			})

			ctx.reply(
				`🎫 Промокод ${code.code} успешно активирован!\nНа ваш баланс начислено <b>${code.amountCoins}</b> BTC`,
				{
					parse_mode: 'HTML',
				}
			)

			// Уведомляем создателя промокода
			ctx.telegram.sendMessage(
				parseInt(creator.id),
				`ℹ️ <b>Промокод активирован</b>\n\nВаш промокод ${code.code} был активирован пользователем @${selfUser.username}\nС вашего баланса списано ${code.amountCoins} BTC`,
				{ parse_mode: 'HTML' }
			)

			return ctx.scene.leave()
		}
	} catch (error) {
		console.log(error)
		ctx.scene.leave()
		return ctx.reply('❗️ Произошла непредвиденная ошибка')
	}
}

export const ActivatePromo = new Scenes.WizardScene<WizardContext>(
	'activate-promo',
	writePromoCode,
	findPromoCodeAndActivation
)
