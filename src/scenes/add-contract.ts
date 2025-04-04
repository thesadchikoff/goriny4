import {Scenes} from 'telegraf'
import {WizardContext} from 'telegraf/typings/scenes'
import {currencies} from '../keyboards/inline-keyboards/currencies.inline'
import {prisma} from '../prisma/prisma.client'
import currencyService from '../service/currency.service'
import {currencyFormatter} from '../utils/currency-formatter'
import userService from "@/db/user.service";
import {paymentMethodsForContract} from "@/keyboards/inline-keyboards/payment-methods-for-contract.inline";
import { CallbackQuery } from 'telegraf/typings/core/types/typegram';
import { BotContext } from '@/@types/scenes';

type AddContractContext = {
	session: {
		createContract: {
			currentPaymentMethodId: string
			currentCurrency: string
			pricePerCoin: number
			currentRequisite: any
		}
		actionType: string
		currentCurrency: string
		pricePerCoin: number
		currentRequisite: any
	}
	scene: {
		session: {
			minPrice: number
			maxPrice: number
		}
		leave: () => Promise<void>
	}
	from: {
		id: number
	}
	callbackQuery: CallbackQuery.DataQuery
	text: string
	reply: (text: string, options?: any) => Promise<any>
	editMessageText: (text: string, options?: any) => Promise<any>
	wizard: {
		next: () => void
	}
}

const useCurrentPaymentMethod = (ctx: AddContractContext) => {
	const setPaymentMethod = (id: string) => {
		ctx.session.createContract.currentPaymentMethodId = id
	}
	return {
		currentPaymentMethodId: ctx.session.createContract.currentPaymentMethodId,
		setPaymentMethod
	}
}

const selectAction = async (ctx: AddContractContext) => {
	try {
		ctx.session.createContract = {}
		await ctx.editMessageText(`Вы хотите продать или купить криптовалюту?`, {
			parse_mode: 'HTML',
			reply_markup: {
				inline_keyboard: [
					[
						{
							callback_data: JSON.stringify({
								type: 'sell',
							}),
							text: '📈 Хочу продать',
						},
						{
							callback_data: JSON.stringify({
								type: 'buy',
							}),
							text: '📈 Хочу купить',
						},
					],
				],
			},
		})
		return ctx.wizard.next()
	} catch (error) {
		await ctx.reply('Ошибка обработки данных')
	}
	return ctx.wizard.next()
}

const selectCurrency = async (ctx: AddContractContext) => {
	try {
		// @ts-ignore
		console.log(ctx.callbackQuery)
		// @ts-ignore
		const actionType = JSON.parse(ctx.callbackQuery.data)
		// @ts-ignore
		ctx.session.actionType = actionType.type
		const buttons = await currencies(false)
		// @ts-ignore
		console.log(ctx.session.actionType)
		if (actionType.type === 'sell') {
			try {
				await ctx.editMessageText(`Выберите валюту для продажи`, {
					parse_mode: 'HTML',
					reply_markup: {
						inline_keyboard: [...buttons],
					},
				})
				return ctx.wizard.next()
			} catch (error) {
				await ctx.reply('Error')
				return ctx.scene.leave()
			}
		}
		if (actionType.type === 'buy') {
			ctx.editMessageText(`Выберите валюту для покупки`, {
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [...buttons],
				},
			})
			return ctx.wizard.next()
		}
		// @ts-ignore
		ctx.session.recipientAddress = ctx.text
	} catch (error) {
		console.log(error)
		return ctx.reply('🤬 Произошла непредвиденная ошибка', {
			reply_markup: {
				inline_keyboard: [
					[
						{
							callback_data: 'main_menu',
							text: 'В главное меню',
						},
					],
				],
			},
		})
	}
}

const chooseCountBTC = async (ctx: AddContractContext) => {
	try {
		// @ts-ignore
		const currentCurrency = JSON.parse(ctx.callbackQuery.data)
		// @ts-ignore
		ctx.session.currentCurrency = currentCurrency.value
		const currentCourseBTC = await currencyService.getCurrency('bitcoin')
		const getMessage = () => {
			switch (currentCurrency.value) {
				case 'RUB':
					return `Средний рыночный курс сейчас: ${currencyFormatter(
						currentCourseBTC?.bitcoin.rub!,
						'rub'
					)}\n\nИсточник: <b>Coingecko</b>`
				case 'USD':
					return `<b>Средний рыночный курс сейчас: </b>${currencyFormatter(
						currentCourseBTC?.bitcoin.usd!,
						'usd'
					)}\n\nИсточник: <b>Coingecko</b>`
				case 'EUR':
					return `<b>Средний рыночный курс сейчас:</b> ${currencyFormatter(
						currentCourseBTC?.bitcoin.eur!,
						'eur'
					)}\n\nИсточник: <b>Coingecko</b>`
			}
		}

		ctx.editMessageText(
			`${getMessage()!}\n\nКаким образом формировать курс BTC в RUB?\n\nПришлите боту сообщение с одним из значений:\n\nПроцент от среднего рыночного курса:\nПример: +5% (или -1%, 0%)\n\nили фиксированное значение в RUB:\nПример: 4000000\n\nили разницу в RUB от биржевого курса:\n\nПример: +15000 (или -15000, -5000)\n\n⚠️ В курсе объявления должны быть учтены все возможные комиссии платёжных систем. Правилами сервиса запрещено взимать дополнительные комиссии с пользователей - покупатели должны переводить точную сумму сделки`,
			{
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [
						[{ callback_data: 'fix_price', text: 'Биржевая стоимость' }]
					],
				},
			}
		)
		return ctx.wizard.next()
	} catch (error) {
		console.log(error)
		return ctx.reply('🤬 Произошла непредвиденная ошибка', {
			reply_markup: {
				inline_keyboard: [
					[
						{
							callback_data: 'main_menu',
							text: 'В главное меню',
						},
					],
				],
			},
		})
	}
}

const sendPricePerOneCoin = async (ctx: AddContractContext) => {
	try {
		// @ts-ignore
		const coinPrice = await currencyService.getCurrency('bitcoin')
		// @ts-ignore
		if (ctx.callbackQuery?.data) {
			// @ts-ignore
			if (ctx.callbackQuery.data === 'fix_price') {
				// @ts-ignore
				if (ctx.session.currentCurrency === 'RUB') {
					// @ts-ignore
					ctx.session.pricePerCoin = coinPrice?.bitcoin.rub
				}
				// @ts-ignore
				else if (ctx.session.currentCurrency === 'USD') {
					// @ts-ignore
					ctx.session.pricePerCoin = coinPrice?.bitcoin.usd
				} else {
					// @ts-ignore
					ctx.session.pricePerCoin = coinPrice?.bitcoin.eur
				}
			}
		} else {
			const userPrice = ctx.text
			// @ts-ignore
			let btcCurrency = coinPrice?.bitcoin.rub
			if (userPrice?.endsWith('%')) {
				if (userPrice?.startsWith("+")) {
					console.log('Расчет процента:', btcCurrency, parseInt(ctx.text!))
					// @ts-ignore
					ctx.session.pricePerCoin = btcCurrency + (btcCurrency * (parseInt(ctx.text!) / 100))
				} else if (userPrice?.startsWith("-")) {
					// @ts-ignore
					ctx.session.pricePerCoin = btcCurrency - (btcCurrency * (Math.abs(parseInt(ctx.text!) / 100)))
				}
			} else {
				if (userPrice?.startsWith("+") || userPrice?.startsWith("-")) {
					// @ts-ignore
					ctx.session.pricePerCoin = btcCurrency + parseInt(ctx.text!)
				} else {
					// @ts-ignore
					ctx.session.pricePerCoin = parseInt(ctx.text!)
				}
			}
		}
		// @ts-ignore
		const pricePerCoin = ctx.session.pricePerCoin
		await ctx.reply(
			`<b>Лимиты</b>\n\nУказанная сумма за 1 BTC: <b>${currencyFormatter(
				pricePerCoin,
				// @ts-ignore
				ctx.session.currentCurrency.toLowerCase()
			)}</b>\n\nВведите мин. и макс. сумму отклика в RUB.\n<b>Например:</b> 1 - 1000000`,
			{
				parse_mode: 'HTML',
			}
		)
		return ctx.wizard.next()
	} catch (error) {
		console.log(error)
		return ctx.reply('🤬 Произошла непредвиденная ошибка', {
			reply_markup: {
				inline_keyboard: [
					[
						{
							callback_data: 'main_menu',
							text: 'В главное меню',
						},
					],
				],
			},
		})
	}
}

const selectPaymentMethod = async (ctx: AddContractContext) => {
	try {
		const message = ctx.text

		const findInt = message?.split('-')
		const numbers = findInt?.map(item => {
			return parseInt(item.trim())
		})

		// Проверяем, что массив numbers существует и содержит два элемента
		if (!numbers || numbers.length !== 2 || isNaN(numbers[0]) || isNaN(numbers[1])) {
			await ctx.reply('Ошибка: введите два числа через дефис, например: 1000 - 5000')
			return
		}

		// Проверяем, что числа положительные
		if (numbers[0] <= 0 || numbers[1] <= 0) {
			await ctx.reply('Ошибка: введите положительные числа')
			return
		}

		// Проверяем, что минимальная сумма не больше максимальной
		if (numbers[0] > numbers[1]) {
			await ctx.reply('Ошибка: минимальная сумма не может быть больше максимальной. Пожалуйста, введите корректные значения.')
			return
		}

		// @ts-ignore
		ctx.scene.session.minPrice = numbers[0]
		// @ts-ignore
		ctx.scene.session.maxPrice = numbers[1]

		const user = await userService.fetchOneById({
			id: ctx.from!.id
		})

		// Проверяем баланс только если это операция продажи
		// @ts-ignore
		if (ctx.session.actionType === "sell") {
			if (!user?.wallet) {
				await ctx.reply('У вас нет кошелька. Пожалуйста, создайте кошелек.')
				return
			}
			// @ts-ignore
			const userCurrencyToBTC = await currencyService.convertRubleToBTC(Number(ctx.scene.session.maxPrice), ctx.session.currentCurrency, "CURRENCY")
			if (user.wallet.balance < userCurrencyToBTC) {
				await ctx.reply('Сумма на балансе меньше суммы лимита')
				return
			}
		}

		const paymentMethods = await prisma.paymentMethod.findMany()
		await ctx.reply(`Выберите способ оплаты`, {
			parse_mode: 'HTML',
			reply_markup: {
				inline_keyboard: [...paymentMethodsForContract(paymentMethods)],
			},
		})
		return ctx.wizard.next()
	} catch (error) {
		console.log(error)
		return ctx.reply('🤬 Произошла непредвиденная ошибка', {
			reply_markup: {
				inline_keyboard: [
					[
						{
							callback_data: 'main_menu',
							text: 'В главное меню',
						},
					],
				],
			},
		})
	}
}

const writePaymentMethod = async (ctx: AddContractContext) => {
	const {setPaymentMethod, currentPaymentMethodId} = useCurrentPaymentMethod(ctx)
	const callbackQuery = ctx.callbackQuery
	setPaymentMethod(callbackQuery.data)

	await prisma.requisite.findMany({
		where: {
			userId: ctx.from.id.toString(),
			paymentMethodId: Number(ctx.session.createContract.currentPaymentMethodId)
		}
	}).then(response => ctx.editMessageText(response ? 'Укажите реквизиты или выберите существующий' : 'Укажите реквизиты', {
		reply_markup: {
			inline_keyboard: [...response.map(button => (
				[
					{
						callback_data: button.id.toString(),
						text: `${button.phoneOrbankCardNumber} | ${button.currency}`
					}
				]
			))]
		}
	}))
	return ctx.wizard.next()
}

const createContract = async (ctx: AddContractContext) => {
	try {
		let initialContractRequisite
		const callbackQuery = ctx.callbackQuery
		if (callbackQuery?.data) {
			const requisite = await prisma.requisite.findFirst({
				where: {
					id: Number(callbackQuery.data)
				}
			})
			ctx.session.currentRequisite = requisite
		}
		const {currentPaymentMethodId} = useCurrentPaymentMethod(ctx)
		initialContractRequisite = await prisma.contractRequisite.create({
			data: {
				paymentMethodId: callbackQuery?.data ? ctx.session.currentRequisite.paymentMethodId : Number(currentPaymentMethodId),
				currency: ctx.session.currentCurrency,
				paymentData: callbackQuery?.data ? ctx.session.currentRequisite.phoneOrbankCardNumber : ctx.text
			}
		})

		// Конвертируем сумму в BTC
		const amountInBTC = await currencyService.convertRubleToBTC(
			ctx.scene.session.maxPrice,
			ctx.session.currentCurrency,
			"CURRENCY"
		)

		const contract = await prisma.contract.create({
			data: {
				type: ctx.session.actionType,
				price: ctx.scene.session.minPrice,
				amount: amountInBTC,
				userId: ctx.from.id.toString(),
				currency: ctx.session.currentCurrency,
				maxPrice: ctx.scene.session.maxPrice,
				paymentMethodId: callbackQuery?.data ? ctx.session.currentRequisite.paymentMethodId : Number(currentPaymentMethodId),
				contractRequisiteId: initialContractRequisite!.id
			},
			include: {
				paymentMethod: true,
			}
		})

		// Обновляем баланс пользователя
		const user = await userService.fetchOneById({
			id: ctx.from.id
		})

		if (user?.wallet) {
			if (ctx.session.actionType === "sell") {
				// При продаже уменьшаем баланс
				await userService.changeUserBalance({
					params: {
						id: user.id
					},
					value: user.wallet.balance - amountInBTC
				})
			} else {
				// При покупке увеличиваем баланс
				await userService.changeUserBalance({
					params: {
						id: user.id
					},
					value: user.wallet.balance + amountInBTC
				})
			}
		}

		const finalContractRequisite = await prisma.contractRequisite.findFirst({
			where: {
				id: Number(contract.contractRequisiteId)
			},
			include: {
				paymentMethod: true
			}
		})

		if (!ctx.from?.id) {
			throw new Error('User ID is not defined')
		}

		const paymentMethod = await prisma.paymentMethod.findFirst({
			where: {
				id: finalContractRequisite?.paymentMethodId
			}
		})

		await ctx.reply(
			`📜 Сделка #${contract.code} заключена\n\nЦена за 1 BTC: ${currencyFormatter(
				ctx.session.pricePerCoin,
				ctx.session.currentCurrency
			)}\n\nВремя на оплату сделки: 15 минут\n\nТрейдер: /user_${contract.userId}\nРепутация: 100%\nОтзывы: 😊(0) 🙁(0)\n\nПровел сделок: 0\n\nЗарегистрирован: Дата не определена\n\nУсловия:\nМинимальная сумма - ${currencyFormatter(ctx.scene.session.minPrice, ctx.session.currentCurrency)}\nМаксимальная сумма - ${currencyFormatter(ctx.scene.session.maxPrice, ctx.session.currentCurrency)}\n\nСпособ оплаты: ${paymentMethod?.name}\nРеквизиты для оплаты: ${finalContractRequisite?.paymentData}`,
			{
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [
						[
							{
								callback_data: 'main_menu',
								text: 'В главное меню',
							},
						],
					],
				},
			}
		)
		await ctx.scene.leave()
		return ctx.reply('⚡️')
	} catch (error) {
		console.log(error)
		if (ctx.from?.id) {
			return ctx.reply('🤬 Произошла непредвиденная ошибка', {
				reply_markup: {
					inline_keyboard: [
						[
							{
								callback_data: 'main_menu',
								text: 'В главное меню',
							},
						],
					],
				},
			})
		}
	}
	return
}

export const AddContract = new Scenes.WizardScene<AddContractContext>(
	'add_contract',
	selectAction,
	selectCurrency,
	chooseCountBTC,
	sendPricePerOneCoin,
	selectPaymentMethod,
	writePaymentMethod,
	createContract
)
