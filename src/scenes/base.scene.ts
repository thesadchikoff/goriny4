import {Scenes} from 'telegraf'
import {BotContext} from "@/@types/scenes";
import userService from "@/db/user.service";
import {calculationFee} from "@/utils/calculation-fee";

const sendWalletAddress = async (ctx: BotContext) => {
	ctx.session.transfer = {}
	try {
		await ctx.reply(`Укажите адрес кошелька, на который хотите вывести BTC.`)
		return ctx.wizard.next()
	} catch (error) {
		console.log(error)
		await ctx.scene.leave()
		return ctx.reply('❗️ Произошла непредвиденная ошибка')
	}
}

const sendCountBTC = async (ctx: BotContext) => {
	try {
		await ctx.reply(`Укажите количество BTC  для вывода.`)
		ctx.session.transfer!.recipientAddress = <string>ctx.text
		return ctx.wizard.next()
	} catch (error) {
		console.log(error)
		await ctx.scene.leave()
		return ctx.reply('❗️ Произошла непредвиденная ошибка')
	}
}

const sendBTC = async (ctx: BotContext) => {
	try {
		ctx.session.transfer!.countBTC = <number>Number(ctx.text)
		const user = await userService.fetchOneById({
			id: ctx.from!.id
		})
		const userBalance = user!.wallet!.balance
		if (userBalance < ctx.session.transfer!.countBTC) {
			await ctx.reply('🔴 Баланс BTC на вашем счету ниже заявленной суммы')
			ctx.wizard.back()
			return sendCountBTC(ctx)
		}
		const {valueWithFee} = await calculationFee(ctx.session.transfer!.countBTC)
		await ctx.reply(
			// @ts-ignore
			`Проверьте, все ли данные верны?.\n\nАдрес получателя: <code>${ctx.session.transfer!.recipientAddress}</code>\nСумма перевода: <code>${valueWithFee}</code> BTC`,
			{
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [
						[
							{
								callback_data: 'send-to-admin',
								text: 'Все верно',
							},
							{ callback_data: 'decline', text: 'Начать заново' },
						],
					],
				},
			}
		)
		return ctx.scene.leave()
	} catch (error) {
		console.log(error)
		await ctx.scene.leave()
		return ctx.reply('❗️ Произошла непредвиденная ошибка')
	}
}

export const TransferScene = new Scenes.WizardScene<BotContext>(
	'transfer',
	sendWalletAddress,
	sendCountBTC,
	sendBTC
)
