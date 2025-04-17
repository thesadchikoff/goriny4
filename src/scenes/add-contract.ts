import {Scenes} from 'telegraf'
import {WizardContext} from 'telegraf/typings/scenes'
import {currencies} from '../keyboards/inline-keyboards/currencies.inline'
import {prisma} from '../prisma/prisma.client'
import currencyService from '../service/currency.service'
import {currencyFormatter} from '../utils/currency-formatter'
import userService from "@/db/user.service";
import {paymentMethodsForContract, SUPPORTED_CURRENCIES} from "@/keyboards/inline-keyboards/payment-methods-for-contract.inline";
import { CallbackQuery } from 'telegraf/typings/core/types/typegram';
import { BotContext } from '@/@types/scenes';
import frozenBalanceService from '@/service/frozen-balance.service';

// Расширяем тип WizardContext для более безопасной работы в сценах
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
	let currentPaymentMethodId = ctx.session.createContract.currentPaymentMethodId || ''

	const setPaymentMethod = (id: string) => {
		currentPaymentMethodId = id
		ctx.session.createContract.currentPaymentMethodId = id
		console.log('Setting payment method ID:', id)
		console.log('After setting, current ID:', currentPaymentMethodId)
	}

	return {
		currentPaymentMethodId,
		setPaymentMethod
	}
}

const selectAction = async (ctx: AddContractContext) => {
	try {
		ctx.session.createContract = {
			currentPaymentMethodId: '',
			currentCurrency: '',
			pricePerCoin: 0,
			currentRequisite: null
		}
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
		// Проверяем, не является ли сообщение командой /start
		if (ctx.text === '/start') {
			await ctx.reply('Выход из режима создания контракта');
			return ctx.scene.leave();
		}
		
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
			const currency = currentCurrency.value.toLowerCase()
			const rate = currentCourseBTC?.bitcoin[currency]
			const formattedRate = currencyFormatter(rate!, currency)
			
			return `Средний рыночный курс сейчас: ${formattedRate}\n\nИсточник: <b>Coingecko</b>`
		}

		ctx.editMessageText(
			`${getMessage()!}\n\nКаким образом формировать курс BTC в ${currentCurrency.value}?\n\nПришлите боту сообщение с одним из значений:\n\nПроцент от среднего рыночного курса:\nПример: +5% (или -1%, 0%)\n\nили фиксированное значение в ${currentCurrency.value}:\nПример: ${currentCurrency.value === 'RUB' ? '4000000' : currentCurrency.value === 'USD' ? '50000' : '45000'}\n\nили разницу в ${currentCurrency.value} от биржевого курса:\n\nПример: ${currentCurrency.value === 'RUB' ? '+15000' : currentCurrency.value === 'USD' ? '+200' : '+150'} (или ${currentCurrency.value === 'RUB' ? '-15000' : currentCurrency.value === 'USD' ? '-200' : '-150'}, ${currentCurrency.value === 'RUB' ? '-5000' : currentCurrency.value === 'USD' ? '-50' : '-40'})\n\n⚠️ В курсе объявления должны быть учтены все возможные комиссии платёжных систем. Правилами сервиса запрещено взимать дополнительные комиссии с пользователей - покупатели должны переводить точную сумму сделки`,
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
			)}</b>\n\nВведите мин. и макс. сумму отклика в ${ctx.session.currentCurrency}.\n<b>Например:</b> ${ctx.session.currentCurrency === 'RUB' ? '1 - 1000000' : ctx.session.currentCurrency === 'USD' ? '1 - 10000' : '1 - 9000'}`,
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
		const selectedCurrency = ctx.session.currentCurrency
		const keyboard = await paymentMethodsForContract(paymentMethods, selectedCurrency)
		
		await ctx.reply(`Выберите способ оплаты`, {
			parse_mode: 'HTML',
			reply_markup: {
				inline_keyboard: keyboard,
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
	console.log('Selected payment method:', callbackQuery.data)
	
	// Получаем информацию о выбранном способе оплаты
	const selectedPaymentMethod = await prisma.paymentMethod.findUnique({
		where: {
			id: Number(callbackQuery.data)
		}
	})
	
	if (!selectedPaymentMethod) {
		await ctx.reply('❌ Ошибка: выбранный способ оплаты не найден')
		return
	}
	
	// Проверяем, поддерживает ли выбранный способ оплаты текущую валюту
	const supportedCurrencies = SUPPORTED_CURRENCIES[selectedPaymentMethod.name] || ['RUB', 'USD', 'EUR']
	const isSupported = supportedCurrencies.includes(ctx.session.currentCurrency)
	
	if (!isSupported) {
		await ctx.reply(
			`❌ Ошибка: ${selectedPaymentMethod.name} не поддерживает оплату в ${ctx.session.currentCurrency}\n\n` +
			`Поддерживаемые валюты: ${supportedCurrencies.join(', ')}`
		)
		return
	}
	
	setPaymentMethod(callbackQuery.data)
	console.log('Current payment method ID after set:', currentPaymentMethodId)

	await prisma.requisite.findMany({
		where: {
			userId: ctx.from.id.toString(),
			paymentMethodId: Number(currentPaymentMethodId)
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
		
		// Получаем пользователя и его баланс
		const user = await userService.fetchOneById({
			id: ctx.from.id
		})
		
		// Конвертируем максимальную сумму в BTC
		const maxAmountInBTC = await currencyService.convertRubleToBTC(
			ctx.scene.session.maxPrice,
			ctx.session.currentCurrency,
			"CURRENCY"
		)
		
		// Конвертируем цену за 1 BTC
		const pricePerCoin = ctx.session.pricePerCoin
		
		// Проверяем, достаточно ли у пользователя средств для продажи (только для контрактов типа "sell")
		if (ctx.session.actionType === "sell") {
			// Проверка баланса пользователя
			if (!user?.wallet) {
				return ctx.reply('❌ У вас нет кошелька. Пожалуйста, создайте кошелек.', {
					reply_markup: {
						inline_keyboard: [
							[{ callback_data: 'main_menu', text: 'В главное меню' }]
						]
					}
				});
			}
			
			// Проверяем доступность средств с учетом уже замороженных через сервис
			const balanceCheck = await frozenBalanceService.checkAvailableBalance(
				user.id, 
				maxAmountInBTC
			);
			
			if (!balanceCheck.sufficient) {
				return ctx.reply(`❌ <b>Недостаточно средств на балансе для создания объявления</b>\n\n💰 Ваш баланс: ${balanceCheck.totalBalance.toFixed(8)} BTC\n🧊 Уже заморожено в других объявлениях: ${balanceCheck.frozenBalance.toFixed(8)} BTC\n💵 Доступно: ${balanceCheck.availableBalance.toFixed(8)} BTC\n🔄 Требуется: ${maxAmountInBTC.toFixed(8)} BTC`, {
					parse_mode: 'HTML',
					reply_markup: {
						inline_keyboard: [
							[{ callback_data: 'main_menu', text: 'В главное меню' }]
						]
					}
				});
			}
			
			console.log(`[CONTRACT_CREATE] Freezing ${maxAmountInBTC} BTC for contract`);
		}
		
		// Создаем реквизиты для контракта
		initialContractRequisite = await prisma.contractRequisite.create({
			data: {
				paymentMethodId: callbackQuery?.data ? ctx.session.currentRequisite.paymentMethodId : Number(currentPaymentMethodId),
				currency: ctx.session.currentCurrency,
				paymentData: callbackQuery?.data ? ctx.session.currentRequisite.phoneOrbankCardNumber : ctx.text
			}
		})

		// Создаем контракт
		const contract = await prisma.contract.create({
			data: {
				type: ctx.session.actionType,
				price: ctx.scene.session.minPrice,
				amount: ctx.session.pricePerCoin,
				userId: ctx.from.id.toString(),
				currency: ctx.session.currentCurrency,
				maxPrice: ctx.scene.session.maxPrice,
				contractRequisiteId: initialContractRequisite.id,
				paymentMethodId: callbackQuery?.data ? ctx.session.currentRequisite.paymentMethodId : Number(currentPaymentMethodId)
			}
		})

		// Если контракт типа "sell", замораживаем средства
		if (ctx.session.actionType === "sell") {
			// Замораживаем средства с помощью нового метода
			const freezeResult = await frozenBalanceService.freezeBalance(
				user.id,
				contract.id,
				maxAmountInBTC
			)
			
			if (!freezeResult) {
				console.error(`[CONTRACT_CREATE] Failed to freeze balance for contract #${contract.id}`)
				// Удаляем созданный контракт, так как не удалось заморозить средства
				await prisma.contract.delete({
					where: {
						id: contract.id
					}
				})
				
				return ctx.reply('❌ Произошла ошибка при заморозке средств. Пожалуйста, попробуйте позже.', {
					reply_markup: {
						inline_keyboard: [
							[{ callback_data: 'main_menu', text: 'В главное меню' }]
						]
					}
				})
			}
			
			console.log(`[CONTRACT_CREATE] Successfully froze ${maxAmountInBTC} BTC for contract #${contract.id}`)
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
			`🎉 Сделка успешно создана!\n\n` +
			`📊 Детали сделки:\n` +
			`• Номер: #${contract.code}\n` +
			`• Тип: ${ctx.session.actionType === 'sell' ? 'Продажа' : 'Покупка'} BTC\n` +
			`• Цена за 1 BTC: ${currencyFormatter(ctx.session.pricePerCoin, ctx.session.currentCurrency)}\n\n` +
			`⏰ Время на оплату: 15 минут\n\n` +
			`👤 Трейдер: /user_${contract.userId}\n` +
			`⭐️ Репутация: 100%\n` +
			`📝 Отзывы: 😊(0) 🙁(0)\n` +
			`📈 Проведено сделок: 0\n` +
			`📅 Дата регистрации: Не определена\n\n` +
			`💰 Условия сделки:\n` +
			`• Минимальная сумма: ${currencyFormatter(ctx.scene.session.minPrice, ctx.session.currentCurrency)}\n` +
			`• Максимальная сумма: ${currencyFormatter(ctx.scene.session.maxPrice, ctx.session.currentCurrency)}\n\n` +
			`💳 Способ оплаты: ${paymentMethod?.name}\n` +
			`📱 Реквизиты: ${finalContractRequisite?.paymentData}\n\n` +
			(ctx.session.actionType === 'sell' ? `🧊 Замороженная сумма: ${maxAmountInBTC.toFixed(8)} BTC\n\n` : '') +
			`❗️ Важно: Сохраните номер сделки для дальнейшего отслеживания`,
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
