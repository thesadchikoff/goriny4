import {Scenes} from 'telegraf'
import {InlineKeyboardButton} from 'telegraf/typings/core/types/typegram'
import {WizardContext} from 'telegraf/typings/scenes'

import {prisma} from '../prisma/prisma.client'

const PAGE_SIZE = 5; // Количество элементов на странице

// Функция для получения данных с пагинацией
async function getPagedData(page = 0, entity) {
	const offset = page * PAGE_SIZE;
	const data = await prisma["paymentMethod"].findMany({
		skip: offset,
		take: PAGE_SIZE,
	});
	return data;
}

// Генерация кнопок с пагинацией
function generatePaginationKeyboard(data, page) {
	const paymentMethodButton: InlineKeyboardButton[][] = data.map(
		paymentMethod => {
			const { code, ...result } = paymentMethod
			return [
				{
					callback_data: JSON.stringify(result),
					text: paymentMethod.name,
				},
			]
		}
	)

	// Проверка наличия следующей страницы
	const hasNextPage = data.length === PAGE_SIZE;
	const paginationButtons = [];
	if (page > 0) {
		paginationButtons.push({ text: '⬅️', callback_data: `page_${page - 1}` });
	}
	if (hasNextPage) {
		paginationButtons.push({ text: '➡️', callback_data: `page_${page + 1}` });
	}

	if (paginationButtons.length > 0) {
		paymentMethodButton.push(paginationButtons);
	}

	return {
		reply_markup: {
			inline_keyboard: paymentMethodButton,
		},
	};
}

export const SelectCurrency = new Scenes.WizardScene<WizardContext>(
	'select_currency',
	async ctx => {
		try {
			const currency = await prisma.currency.findMany()
			const currencyButton: InlineKeyboardButton[] = currency.map(cur => {
				return {
					callback_data: cur.id.toString(),
					text: cur.value,
				}
			})
			await ctx.editMessageText('Выберите валюту:', {
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [currencyButton],
				},
			})
		} catch (error) {
			await ctx.reply('Error')
		}
		return ctx.wizard.next()
	},

	async ctx => {
		const page = 0;
		const data = await getPagedData(page);
		if (ctx.callbackQuery) {
			// @ts-ignore
			const callbackData = ctx.callbackQuery?.data

			console.log('callback id', Number(callbackData))
			try {
				const currentCurrency = await prisma.currency.findFirst({
					where: {
						id: Number(callbackData),
					},
				})

				// Сохранение объекта в сессию
				// @ts-ignore
				ctx.session.selectedCurrency = currentCurrency
				await ctx.editMessageText(
					`Выберите банк для принятия платежей: ${currentCurrency?.value}`,
					{
						parse_mode: 'HTML',
						reply_markup: {
							inline_keyboard: generatePaginationKeyboard(data, page).reply_markup.inline_keyboard,
						},
					}
				)
				ctx.wizard.state.page = page;
			} catch (error) {
				console.log(error)
				await ctx.reply('Ошибка при обработке данных')
			}
			return ctx.wizard.next()
		}

		return ctx.reply("Выберите валюту из списка!")
	},
	async ctx => {
		try {
			if (ctx.callbackQuery && ctx.callbackQuery.data.startsWith('page_')) {
				const page = parseInt(ctx.callbackQuery.data.split('_')[1]);
				const data = await getPagedData(page);

				// Обновление текущей страницы в состоянии сцены
				ctx.wizard.state.page = page;

				// Обновление сообщения с новым набором данных
				await ctx.editMessageReplyMarkup(generatePaginationKeyboard(data, page).reply_markup);

				// Оставляем пользователя на текущем шаге сцены
				await ctx.answerCbQuery(); // Убирает "часики" на кнопке
				return ctx.wizard.selectStep(ctx.wizard.cursor);
			}
			// @ts-ignore
			const callbackData = ctx.callbackQuery?.data
			const currentPaymentMethod = JSON.parse(callbackData)
			// @ts-ignore
			ctx.session.currentPaymentMethod = currentPaymentMethod
			// @ts-ignore
			ctx.session.countBTC = ctx.text
			// @ts-ignore
			ctx.scene.state.countBTC = ctx.text
			ctx.reply(
				// @ts-ignore
				`Пришлите номер карты (или номер телефона) для получения платежей через ${currentPaymentMethod?.name}.`,
				{
					parse_mode: 'HTML',
				}
			)
		} catch (error) {
			console.log(error)
			ctx.reply('Ошибка при обработке данных')
		}
		return ctx.wizard.next()
	},
	async ctx => {
		try {
			console.log(ctx.text)
			// @ts-ignore
			ctx.session.phoneOrBankCardNumber = ctx.text
			const createRequisite = await prisma.requisite.create({
				data: {
					userId: ctx.from!.id.toString(),
					// @ts-ignore
					paymentMethodId: ctx.session.currentPaymentMethod.id,
					// @ts-ignore
					phoneOrbankCardNumber: ctx.session.phoneOrBankCardNumber,
					// @ts-ignore
					currency: ctx.session.selectedCurrency.value,
				},
				include: {
					paymentMethod: true,
				},
			})
			ctx.reply(
				// @ts-ignore
				`<b>Реквизит создан</b>\n\nТип операции: <code>Банковский перевод</code>\nВалюта: <code>${createRequisite.currency}</code>\nСпособ оплаты: <code>${createRequisite.paymentMethod.name}</code>\nРеквизиты: <code>${createRequisite.phoneOrbankCardNumber}</code>`,
				{
					parse_mode: 'HTML',
					reply_markup: {
						inline_keyboard: [
							[
								{
									callback_data: 'requisites',
									text: '← Назад',
								},
							],
						],
					},
				}
			)
			return ctx.scene.leave()
		} catch (error) {
			console.log(error)
			ctx.scene.leave()
			return ctx.reply('❗️ Произошла непредвиденная ошибка')
		}
	}
)
