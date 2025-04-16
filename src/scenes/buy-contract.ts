import * as cron from 'node-cron'
import {Scenes} from 'telegraf'
import {WizardContext} from 'telegraf/typings/scenes'
import {prisma} from '../prisma/prisma.client'
import {currencyFormatter} from '../utils/currency-formatter'
import {dateFormat} from '../utils/format-date'
import userService from "@/db/user.service";
import currencyService from "@/service/currency.service";

const sendBuyAmount = async (ctx: WizardContext) => {
	try {
		console.log(ctx.session.currentTradeType)
		const userTransactions = await prisma.contractTransaction.findFirst({
			where: {
				buyerId: ctx.from?.id.toString()!,
			},
		})
		if (userTransactions) {
			await ctx.reply(
				'У вас есть активная транзакция. Начать новую невозможно.'
			)
			return ctx.scene.leave()
		}
		const contract = await prisma.contract.findFirst({
			where: {
				id: ctx.session.currentContractId
			},
			include: {
				author: {
					include: {
						SellerContractTransaction: true
					}
				},
				paymentMethod: {
					include: {
						Requisite: true
					}
				},
				ContractRequisite: true
			}
		})
		const currentMethod = contract?.paymentMethod.Requisite.filter(
			requisite => requisite.paymentMethodId !== contract.paymentMethod.id
		)
		console.log(currentMethod)
		ctx.scene.state = {}
		// @ts-ignore
		ctx.scene.state.contract = JSON.stringify(contract)
		// @ts-ignore
		const currentContract = ctx.scene.state.contract

		await ctx.reply(
			`Введите сумму в ${contract?.currency?.toUpperCase()} для ${ctx.session.currentTradeType === 'sell' ? "покупки" : "продажи"}\n\nМинимальная сумма покупки - ${currencyFormatter(
				// @ts-ignore
				contract?.price!,
				// @ts-ignore
				contract?.currency!
			)}\nМаксимальная сумма покупки - ${currencyFormatter(
				// @ts-ignore
				contract?.maxPrice!,
				// @ts-ignore
				contract?.currency!
			)}` +
			(contract?.comment ? `\n\n<b>Описание контракта:</b>\n${contract.comment}` : ''),
			{
				parse_mode: 'HTML',
			}
		)
		return ctx.wizard.next()
	} catch (error) {
		console.log(error)
		await ctx.scene.leave()
		return ctx.reply('❗️ Произошла непредвиденная ошибка')
	}
}

const doneContract = async (ctx: WizardContext) => {
	try {
		// @ts-ignore
		const contract = JSON.parse(ctx.scene.state.contract)
		const sendPrice = parseInt(ctx.text!)
		console.log('CONTRACT', contract)
		if (contract.type === 'buy') {
			const user = await userService.fetchOneById({
				id: ctx!.from!.id
			})
			const userBalance = await currencyService.convertRubleToBTC(user!.wallet!.balance)
            console.log(sendPrice, userBalance)
			if (userBalance < Number(sendPrice)) {
				await ctx.reply('Ваш баланс ниже, чем указанная вами сумма продажи. Повторите снова')
				ctx.wizard.back()
				return sendBuyAmount(ctx)
			}
		}
		if (sendPrice < contract.price || sendPrice > contract.maxPrice) {
			await ctx.reply('Некорректно указана сумма, повторите еще раз.')
			ctx.wizard.back()
			return sendBuyAmount(ctx)
		} else {
			// Создаем транзакцию синхронно, чтобы гарантировать получение ID
			try {
				// Проверка, что пользователь не пытается купить у самого себя
				if (contract.author.id === ctx.from?.id.toString()) {
					await ctx.reply('❌ <b>Ошибка</b>\n\nВы не можете купить у самого себя', {
						parse_mode: 'HTML'
					});
					return ctx.scene.leave();
				}
				
				console.log('[BUY_CONTRACT] Creating transaction');
				
				// Создаем транзакцию и сразу получаем результат
				const newTransaction = await prisma.contractTransaction.create({
					data: {
						buyerId: ctx.from?.id.toString()!,
						sellerId: contract.author.id,
						amount: sendPrice,
						contractId: contract.id,
						isAccepted: false
					},
				});
				
				// Сохраняем ID для отладки
				console.log('[BUY_CONTRACT] Created transaction with ID:', newTransaction.id);
				
				// Настраиваем таймеры для уведомлений и удаления
				const taskNotifyForUsers = cron.schedule(
					'* 12 * * * *',
					async () => {
						await ctx.telegram.sendMessage(
							Number(newTransaction.buyerId),
							`❗️ До отмены сделки осталось 3 минуты. Поспешите завершить её`
						);
						await ctx.telegram.sendMessage(
							Number(newTransaction.sellerId),
							`❗️ До отмены сделки осталось 3 минуты. Поспешите завершить её`
						);
						taskNotifyForUsers.stop();
					}
				);
				
				const taskDeleteTransaction = cron.schedule(
					'* 15 * * * *',
					async () => {
						await prisma.contractTransaction.delete({
							where: {
								id: newTransaction.id,
							},
						});
						taskDeleteTransaction.stop();
					}
				);
				
				// Отправляем сообщение пользователю с кнопкой отмены
				await ctx.reply(
					`🎉 <b>Сделка успешно создана!</b>\n\n` +
					`📊 <b>Детали сделки:</b>\n` +
					`• Номер: #${contract?.code}\n` +
					`• Тип: Покупка BTC\n` +
					`• Цена за 1 BTC: ${currencyFormatter(contract?.amount!, contract?.currency!)}\n\n` +
					`⏰ Время на оплату: 15 минут\n\n` +
					`👤 <b>Информация о продавце:</b>\n` + 
					`• Трейдер: /${contract?.author.login}\n` +
					`• Репутация: 100%\n` +
					`• Отзывы: 😊(0) 🙁(0)\n` +
					`• Проведено сделок: 0\n` +
					`• Дата регистрации: ${dateFormat(contract?.author.createdAt!)}\n\n` +
					`💰 <b>Условия сделки:</b>\n` +
					`• Минимальная сумма: ${currencyFormatter(contract!.price!, contract?.currency!)}\n` +
					`• Максимальная сумма: ${currencyFormatter(contract!.maxPrice!, contract?.currency!)}\n\n` +
					`💳 <b>Способ оплаты:</b> ${contract?.paymentMethod?.name || 'Не указан'}\n` +
					`📱 <b>Реквизиты для оплаты:</b> ${contract?.ContractRequisite?.paymentData || 'Не указаны'}\n\n` +
					`❗️ <b>Важно:</b> Сохраните номер сделки для дальнейшего отслеживания`,
					{
						parse_mode: 'HTML',
						reply_markup: {
							inline_keyboard: [
								[
									{
										text: '❌ Отменить',
										callback_data: `cancel-transaction-${newTransaction.id}`
									},
									{
										callback_data: `send-message-${contract.author.id}`,
										text: '✉️ Ответить',
									},
								],
							],
						},
					}
				);
				
				// Отправляем уведомление продавцу
				const currentUser = await prisma.user.findFirst({
					where: {
						id: ctx.from?.id.toString(),
					},
				});
				
				const btcPerCurrency = await currencyService.convertRubleToBTC(sendPrice, contract.currency, "CURRENCY");
				
				await ctx.telegram.sendMessage(
					contract.author.id,
					`Новое предложение о ${
						contract.type === 'buy' ? 'продаже' : 'покупке'
					} по объявлению #${contract.code}\n\nПокупает /${
						currentUser!.login
					}\nBTC на сумму ${currencyFormatter(sendPrice, contract.currency)} (${btcPerCurrency.toFixed(6)} BTC)`,
					{
						parse_mode: 'HTML',
						reply_markup: {
							inline_keyboard: [
								[
									{
										callback_data: `send-message-${ctx.from?.id}`,
										text: '✉️ Ответить',
									},
								],
							],
						},
					}
				);
			} catch (error) {
				console.error('[BUY_CONTRACT] Error creating transaction:', error);
				await ctx.reply('❗️ Произошла ошибка при создании сделки. Попробуйте еще раз.');
			}
		}
		ctx.scene.state = {}
		return ctx.scene.leave()
	} catch (error) {
		console.log(error)
		ctx.scene.leave()
		return ctx.reply('❗️ Произошла непредвиденная ошибка')
	}
}

export const BuyContract = new Scenes.WizardScene<WizardContext>(
	'buy-contract',
	sendBuyAmount,
	doneContract
)
