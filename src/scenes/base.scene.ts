import {Scenes} from 'telegraf'
import {BotContext} from "@/@types/scenes";
import userService from "@/db/user.service";
import {calculationFee} from "@/utils/calculation-fee";

const sendWalletAddress = async (ctx: BotContext) => {
	// Инициализируем объект transfer в сессии
	(ctx.session as any).transfer = {};
	(ctx.session as any).countBTC = undefined;
	
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
		// Сохраняем адрес получателя
		(ctx.session as any).transfer.recipientAddress = ctx.text;
		console.log("Адрес получателя сохранен:", (ctx.session as any).transfer.recipientAddress);
		
		await ctx.reply(`Укажите количество BTC для вывода.`)
		return ctx.wizard.next()
	} catch (error) {
		console.log(error)
		await ctx.scene.leave()
		return ctx.reply('❗️ Произошла непредвиденная ошибка')
	}
}

const sendBTC = async (ctx: BotContext) => {
	try {
		// Сохраняем сумму перевода
		(ctx.session as any).countBTC = Number(ctx.text);
		console.log("Сумма перевода сохранена:", (ctx.session as any).countBTC);
		
		const user = await userService.fetchOneById({
			id: ctx.from!.id
		})
		const userBalance = user!.wallet!.balance
		if (userBalance < (ctx.session as any).countBTC) {
			await ctx.reply('🔴 Баланс BTC на вашем счету ниже заявленной суммы')
			ctx.wizard.back()
			return sendCountBTC(ctx)
		}
		const {valueWithFee} = await calculationFee((ctx.session as any).countBTC)
		await ctx.reply(
			`Проверьте, все ли данные верны?.\n\nАдрес получателя: <code>${(ctx.session as any).transfer.recipientAddress}</code>\nСумма перевода: <code>${valueWithFee}</code> BTC`,
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
