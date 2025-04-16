import {bot} from '@/config/bot'
import {currencies} from '@/keyboards/inline-keyboards/currencies.inline'
import {inlineKeyboardForSettings} from '@/keyboards/inline-keyboards/keyboard-for-settings.inline'
import {previousButton} from '@/keyboards/inline-keyboards/previous-button.inline'

import {getMyContracts} from '@/callbacks/get-my-contracts'
import {myCodes} from '@/callbacks/my-codes'
import {requisites} from '@/callbacks/requisites'
import {transferHistory} from '@/callbacks/transfer-history'
import {config} from '@/config/service.config'
import userService from '@/db/user.service'
import {adminInlineKeyboards} from '@/keyboards/inline-keyboards/admin.inline'
import {marketKeyboard} from '@/keyboards/inline-keyboards/p2p-keyboard.inline'
import {promoCodesButtons} from '@/keyboards/inline-keyboards/promo-codes'
import {startInlineKeyboards} from '@/keyboards/inline-keyboards/start-keyboard.inline'
import {prisma} from '@/prisma/prisma.client'
import {getWalletBalance} from '@/trust-wallet/get-balance'
import {replenishBtc} from '@/trust-wallet/replenish-coin'
import {calculationFee} from '@/utils/calculation-fee'
import {currencyFormatter} from '@/utils/currency-formatter'
import {dateFormat} from '@/utils/format-date'
import {Networks} from 'bitcore-lib'
import {InlineKeyboardButton} from 'telegraf/typings/core/types/typegram'
import currencyService from '../service/currency.service'
import disputeModule from "@/core/dispute/dispute.module";
import { cancelTransactionAction } from '@/actions/transfer/cancel-transaction.action'
import frozenBalanceService from '@/service/frozen-balance.service';
import { selfContractAction } from '@/actions'

export const callbackHandler = () => {
	bot.on('callback_query', async query => {
		try {
			// @ts-ignore
			const data = query.update.callback_query?.data
			console.log(query.update.callback_query.from.id.toString())
			const user = await prisma.user.findFirst({
				where: {
					id: query.update.callback_query.from.id.toString(),
				},
			})

			switch (data) {
				case 'settings':
					try {
						const user = await prisma.user.findFirst({
							where: {
								id: query.from.id.toString(),
							},
						})
						return query.editMessageText(
							`<b>🔧 ${config.shopName} | Настройки</b>\n\nВаше уникальное имя в боте: <b>${user?.login}</b>\n\nТут вы можете настроить ваш аккаунт.`,
							{
								parse_mode: 'HTML',
								reply_markup: {
									inline_keyboard: inlineKeyboardForSettings(user?.isAdmin!),
								},
							}
						)
					} catch (error) {
						return query.reply(String(error))
					}
				case 'promo':
					try {
						const myCodes = await prisma.code.findMany({
							where: {
								creatorId: query.from.id.toString(),
							},
						})
						return query.reply('🎫 Управление кодами', {
							reply_markup: {
								inline_keyboard: promoCodesButtons(myCodes.length),
							},
						})
					} catch (error) {
						console.error(error)
					}
				case 'activate_code':
					return query.scene.enter('activate-promo')
				case 'promo_information':
					try {
						return query.editMessageText(
							`ℹ️ О ${config.shopName} Codes\nВ этом разделе вы можете управлять вашими кодами ${config.shopName} Code\n${config.shopName} Code  - это код на сумму в криптовалюте, который может быть активирован любым пользователем ${config.shopName}\nПри создании кода, указанная вами сумма будет заблокирована в депонировании до тех пор, пока код не будет активирован или деактивирован\nСумма неактивированного кода учитывается при активации ваших объявлений на покупку\nВы можете передавать ссылку с кодом пользователям, которые не имеют аккаунта на ${config.shopName}. Каждый зарегистрированный по вашей ссылке пользователь будет автоматически становиться вашим рефералом`,
							{
								parse_mode: 'HTML',
								reply_markup: {
									inline_keyboard: [previousButton('promo')],
								},
							}
						)
					} catch (error) {
						console.error(error)
					}
				case 'add_requisite':
					return query.scene.enter('select_currency')
				case 'cancel_scene':
					console.log(query.scene, 'test')
					await query.scene.leave()
					return query.answerCbQuery('main_menu')
				case 'decline':
					query.session = {}
					query.scene.leave()
					return query.scene.enter('transfer')
				case 'create-address':
					return query.scene.enter('address-book')
				case 'decline_replenish':
					query.session = {}
					query.scene.leave()
					return query.scene.enter('replenish')
				case 'confirm_replenish':
					query.deleteMessage()
					const replenish = replenishBtc(
						query.from.id,
						// @ts-ignore
						query.session.privateKey,
						// @ts-ignore
						query.session.sourceAddress,
						// @ts-ignore
						query.session.countBTC,
						Networks.mainnet
					)
					console.log(replenish)
					query.session = {}
					query.scene.leave()
					return
				case 'transfer_history':
					return transferHistory(query)
				case 'requisites':
					return requisites(query)
				case 'p2p_transfer':
					return query.editMessageText(
						`<strong>💱 ${config.shopName} | Обмен криптовалюты</strong>\n\n
		Все транзакции осуществляются между участниками нашего сервиса.\n\nМы выступаем в роли посредника, удерживая криптовалюту продавца до завершения операции.\nЭто обеспечивает безопасность как для продавца, так и для покупателя.\n\nВы можете заключать сделки на основе предложений других пользователей или создавать свои собственные объявления с индивидуальными условиями.
		`,
						{
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: marketKeyboard,
							},
						}
					)
				case 'main_menu':
					try {
						return query.editMessageText(
							`<b>💰 ${config.shopName} | Меню</b>\n\nВыберите интересующий вас пункт:`,
							{
								parse_mode: 'HTML',
								reply_markup: {
									inline_keyboard: startInlineKeyboards,
								},
							}
						)
					} catch (error) {
						return query.reply(String(error))
					}
				case 'set_currency':
					try {
						const buttons = await currencies()
						return query.editMessageText(
							`<b>💵 ${config.shopName} | Изменение валюты</b>\n\nВыберите валюту, за которой хотите наблюдать:`,
							{
								reply_markup: {
									inline_keyboard: [...buttons, previousButton('settings')],
								},
								parse_mode: 'HTML',
							}
						)
					} catch (error) {
						return query.reply(String(error))
					}
				case 'course_currency':
					try {
						const userCurrency = await prisma.user.findFirst({
							where: {
								id: query.from.id.toString(),
							},
							include: {
								currency: true,
							},
						})
						if (!userCurrency?.currency) {
							// @ts-ignore
							const buttons = await currencies()
							return query.editMessageText(
								`<b>📊 ${config.shopName} | Курс</b>\n\nНе получилось получить курс валюты\n\nПеред тем как получить курс валюты, вам необходимо выбрать ее`,
								{
									parse_mode: 'HTML',
									reply_markup: {
										inline_keyboard: userCurrency?.isAdmin
											? [
												...buttons,
												[
													{
														text: 'Добавить валюту',
														callback_data: 'set_currency',
													},
												],
												previousButton('settings'),
											]
											: [...buttons, previousButton('settings')],
									},
								}
							)
						}
						const currency = await currencyService.getCurrency('bitcoin')
						return query.editMessageText(
							`<b>📊 ${config.shopName} | Курс ${userCurrency?.currency.value
							}</b>\n\n<b>EUR:</b> ${currencyFormatter(
								currency?.bitcoin.eur!,
								'eur'
							)} €\n<b>USD:</b> ${currencyFormatter(
								currency?.bitcoin.usd!,
								'usd'
							)} $\n<b>RUB:</b> ${currencyFormatter(
								currency?.bitcoin.rub!,
								'rub'
							)} ₽`,
							{
								parse_mode: 'HTML',
								reply_markup: {
									inline_keyboard: [previousButton('settings')],
								},
							}
						)
					} catch (error) {
						return query.reply(String(error))
					}
				case 'admin-panel':
					return query.editMessageText(
						`👨‍💻 <b>Панель администратора</b>\n\n` +
						`Через эту панель вы можете управлять важными параметрами системы и выполнять администраторские функции.`,
						{
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: [
									...adminInlineKeyboards,
									previousButton('settings'),
								],
							},
						}
					)
				case 'admin-users':
					try {
						const usersPerPage = 5;
						const page = 1;
						const totalUsers = await prisma.user.count();
						const totalPages = Math.ceil(totalUsers / usersPerPage);
						
						const users = await prisma.user.findMany({
							skip: (page - 1) * usersPerPage,
							take: usersPerPage,
							orderBy: { createdAt: 'desc' },
							include: { wallet: true }
						});
						
						// Формируем кнопки пользователей
						const userButtons = users.map(user => [
							{
								callback_data: `admin-user-details-${user.id}`,
								text: `${user.isBlocked ? '🔒 ' : ''}${user.username || 'Нет имени'} ${user.isAdmin ? '👑' : ''} | ${user.wallet?.balance || 0} BTC`
							}
						]);
						
						// Добавляем кнопки пагинации, если страниц больше одной
						if (totalPages > 1) {
							const paginationButtons = [];
							
							// Кнопка "Назад" (неактивна на первой странице)
							if (page > 1) {
								paginationButtons.push({
									callback_data: `admin-users-page-${page - 1}`,
									text: '◀️ Назад'
								});
							}
							
							// Номер текущей страницы и общее количество
							paginationButtons.push({
								callback_data: 'none',
								text: `${page} из ${totalPages}`
							});
							
							// Кнопка "Вперед" (неактивна на последней странице)
							if (page < totalPages) {
								paginationButtons.push({
									callback_data: `admin-users-page-${page + 1}`,
									text: 'Вперед ▶️'
								});
							}
							
							userButtons.push(paginationButtons);
						}
						
						// Кнопка возврата в админ-панель
						userButtons.push(previousButton('admin-panel'));
						
						return query.editMessageText(
							`👥 <b>Управление пользователями</b>\n\n` +
							`Всего пользователей: <b>${totalUsers}</b>\n\n` +
							`Выберите пользователя для просмотра информации:`,
							{
								parse_mode: 'HTML',
								reply_markup: {
									inline_keyboard: userButtons
								}
							}
						);
					} catch (error) {
						console.error('[ADMIN_USERS] Error:', error);
						return query.editMessageText(
							'❌ Произошла ошибка при получении списка пользователей',
							{
								reply_markup: {
									inline_keyboard: [previousButton('admin-panel')]
								}
							}
						);
					}
				case 'change_fee':
					return query.scene.enter('change-fee')
				case 'bitcoin-add':
					try {
						// @ts-ignore
						const coinSplit = query.update.callback_query?.data.split('-')
						const currencyFind = await prisma.currency.findFirst({
							where: {
								key: coinSplit[0],
							},
						})
						if (!currencyFind) {
							return query.editMessageText(
								'Произошла ошибка при установки валюты',
								{
									parse_mode: 'HTML',

									reply_markup: {
										inline_keyboard: [previousButton('settings')],
									},
								}
							)
						}
						await prisma.user.update({
							where: {
								id: query.from.id.toString(),
							},
							data: {
								currency: {
									connect: {
										id: currencyFind.id,
									},
								},
							},
						})
						return query.editMessageText(
							`Вы успешно установили себе валюту ${currencyFind.value}`,
							{
								parse_mode: 'HTML',

								reply_markup: {
									inline_keyboard: [previousButton('settings')],
								},
							}
						)
					} catch (error) {
						return query.reply(String(error))
					}
				case 'history_transfer':
					console.log('enter to transfer history callback')
					return transferHistory(query)
				case 'create_code':
					return query.scene.enter('create-promo')
				case 'buy':
					query.session.currentTradeType = 'buy'
					const getUserForBuy = await prisma.user.findFirst({
						where: {
							id: query.from.id.toString(),
						},
						include: {
							wallet: true,
						},
					})

					const userBalanceForBuy = await getWalletBalance(
						getUserForBuy?.wallet?.address
					)
					// if (userBalanceForBuy === 0)
					// 	return query.answerCbQuery(
					// 		'🚫 Баланс на вашем кошельке недостаточен для продажи BTC.',
					// 		{
					// 			show_alert: true,
					// 		}
					// 	)
					const paymentMethodsForBuy = await prisma.paymentMethod.findMany({
						include: {
							Contract: {
								where: {
									type: 'buy',
								},
							},
						},
					})
					const paymentMethodButtonForBuy: InlineKeyboardButton[][] =
						paymentMethodsForBuy.map(paymentMethod => {
							return [
								{
									callback_data: `buy_payment_method_${paymentMethod.id}`,
									text: `${paymentMethod.name} | [${paymentMethod.Contract.length}]`,
								},
							]
						})
					return query.editMessageText(
						`Выберите способ оплаты для покупки BTC за RUB.`,
						{
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: [
									...paymentMethodButtonForBuy,
									previousButton('p2p_transfer'),
								],
							},
						}
					)
				case 'profile':
					const userForProfile = await prisma.user.findFirst({
						where: {
							id: query.from.id.toString(),
						},
						include: {
							Contract: true,
						},
					})
					return query.editMessageText(
						`👤 <b>${userForProfile?.username}</b> ${userForProfile?.isAdmin ? '[Администратор]' : ''
						}\n\n<b>Статистика торговли</b>\n📈 <i>Количество сделок:</i> <b>${userForProfile?.Contract.length
						}</b>`,
						{
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: [previousButton('p2p_transfer')],
							},
						}
					)
				case 'sell':
					query.session.currentTradeType = 'sell'
					const getUser = await prisma.user.findFirst({
						where: {
							id: query.from.id.toString(),
						},
						include: {
							wallet: true,
						},
					})
					const userBalance = await getWalletBalance(getUser?.wallet?.address)

					// if (userBalance === 0)
					// 	return query.answerCbQuery(
					// 		'🚫 Баланс на вашем кошельке недостаточен для продажи BTC.',
					// 		{
					// 			show_alert: true,
					// 		}
					// 	)
					const paymentMethods = await prisma.paymentMethod.findMany({
						include: {
							Contract: {
								where: {
									type: 'sell',
								},
							},
						},
					})
					const paymentMethodButton: InlineKeyboardButton[][] =
						paymentMethods.map(paymentMethod => {
							return [
								{
									callback_data: `sell_payment_method_${paymentMethod.id}`,
									text: `${paymentMethod.name} | [${paymentMethod.Contract.length}]`,
								},
							]
						})
					return query.editMessageText(
						`Выберите способ оплаты для продажи BTC за RUB.`,
						{
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: [
									...paymentMethodButton,
									previousButton('p2p_transfer'),
								],
							},
						}
					)
				case 'add_my_contract':
					return query.scene.enter('add_contract')
				case 'buy_contract':
					query.session.currentContractId = query.scene.state.contractId
					return query.scene.enter('buy-contract', {
						// @ts-ignore
						id: query.scene.state.contractId,
					})
				case 'my_ads':
					return getMyContracts(query)
				case 'my_codes':
					return myCodes(query)
			}
			const matchRequisite = data.match(/^requisite_(\d+)$/)
			const matchSellPaymentMethod = data.match(/^sell_payment_method_(\d+)$/)
			const matchBuyPaymentMethod = data.match(/^buy_payment_method_(\d+)$/)
			const matchDeleteRequisite = data.match(/^delete_requisite_(\d+)$/)
			const matchSellContract = data.match(/^sell_contract_(\d+)$/)
			const matchBuyContract = data.match(/^buy_contract_(\d+)$/)
			const matchPaymentContract = data.match(/^payment-contract-(\d+)$/)
			const matchDeleteContract = data.match(/^delete-contract-(\d+)$/)
			const matchSendMessageTo = data.match(/^send-message-(\d+)$/)
			const matchPaymentSuccessful = data.match(/^payment-successful-(\d+)$/)
			const matchCancelTransaction = data.match(/^cancel-transaction-(.+)$/)
			const matchUserDetails = data.match(/^admin-user-details-(\d+)$/)
			const matchUserBlock = data.match(/^admin-user-block-(\d+)$/)
			const matchUserUnblock = data.match(/^admin-user-unblock-(\d+)$/)
			const matchUsersPagination = data.match(/^admin-users-page-(\d+)$/)
			const matchUserFreezeTransfer = data.match(/^admin-user-freeze-transfer-(\d+)$/)
			const matchUserUnfreezeTransfer = data.match(/^admin-user-unfreeze-transfer-(\d+)$/)

			// Обработка детальной информации о пользователе
			if (matchUserDetails) {
				try {
					console.log('[ADMIN_USER_DETAILS] User ID:', matchUserDetails[1]);
					const userId = matchUserDetails[1];
					
					// Получаем пользователя
					const user = await prisma.user.findFirst({
						where: { id: userId },
						include: { 
							wallet: true 
						}
					});
					
					if (!user) {
						return query.editMessageText(
							'❌ Пользователь не найден',
							{
								reply_markup: {
									inline_keyboard: [previousButton('admin-users')]
								}
							}
						);
					}
					
					// Получаем информацию о замороженных средствах
					const frozenInfo = await frozenBalanceService.checkAvailableBalance(
						userId,
						0 // 0, так как нам не нужно проверять доступность для определенной суммы
					);
					
					// Считаем количество контрактов
					const contractCount = await prisma.contract.count({
						where: { userId: userId }
					});
					
					// Считаем количество транзакций (как покупатель + как продавец)
					const buyerTransactionCount = await prisma.contractTransaction.count({
						where: { buyerId: userId }
					});
					const sellerTransactionCount = await prisma.contractTransaction.count({
						where: { sellerId: userId }
					});
					const transactionCount = buyerTransactionCount + sellerTransactionCount;
					
					// Форматируем даты
					const registeredAt = new Date(user.createdAt).toLocaleString('ru-RU');
					const updatedAt = new Date(user.createdAt).toLocaleString('ru-RU'); // Используем createdAt вместо updatedAt
					
					// Создаем кнопки действий для пользователя
					const actionButtons = [];
					
					// Кнопка блокировки/разблокировки пользователя
					actionButtons.push([{
						callback_data: user.isBlocked 
							? `admin-user-unblock-${user.id}` 
							: `admin-user-block-${user.id}`,
						text: user.isBlocked 
							? '🔓 Разблокировать пользователя' 
							: '🔒 Заблокировать пользователя'
					}]);
					
					// Кнопка замораживания/размораживания переводов
					actionButtons.push([{
						callback_data: user.isFreezeTransfer
							? `admin-user-unfreeze-transfer-${user.id}`
							: `admin-user-freeze-transfer-${user.id}`,
						text: user.isFreezeTransfer
							? '💲 Разрешить переводы'
							: '❄️ Заморозить переводы'
					}]);
					
					// Кнопка назад к списку пользователей
					actionButtons.push(previousButton('admin-users'));
					
					return query.editMessageText(
						`👤 <b>Информация о пользователе</b>\n\n` +
						`ID: <code>${user.id}</code>\n` +
						`Имя пользователя: <b>${user.username || 'Не указано'}</b>\n` +
						`Логин: <b>${user.login || 'Не указан'}</b>\n` +
						`Статус: ${user.isAdmin ? '👑 Администратор' : '👤 Пользователь'}${user.isBlocked ? ' 🔒 Заблокирован' : ''}\n` +
						`Переводы: ${user.isFreezeTransfer ? '❄️ Заморожены' : '✅ Разрешены'}\n\n` +
						`💰 <b>Баланс</b>\n` +
						`• Общий баланс: <b>${frozenInfo.totalBalance.toFixed(8)} BTC</b>\n` +
						`• Доступный баланс: <b>${frozenInfo.availableBalance.toFixed(8)} BTC</b>\n` +
						`• Замороженный баланс: <b>${frozenInfo.frozenBalance.toFixed(8)} BTC</b>\n\n` +
						`📊 <b>Статистика</b>\n` +
						`• Количество сделок: <b>${transactionCount}</b>\n` +
						`• Количество объявлений: <b>${contractCount}</b>\n\n` +
						`⏰ <b>Время</b>\n` +
						`• Дата регистрации: <b>${registeredAt}</b>\n` +
						`• Последнее обновление: <b>${updatedAt}</b>`,
						{
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: actionButtons
							}
						}
					);
				} catch (error) {
					console.error('[ADMIN_USER_DETAILS] Error:', error);
					return query.editMessageText(
						'❌ Произошла ошибка при получении информации о пользователе',
						{
							reply_markup: {
								inline_keyboard: [previousButton('admin-users')]
							}
						}
					);
				}
			}
			
			// Обработка блокировки пользователя
			if (matchUserBlock) {
				try {
					const userId = matchUserBlock[1];
					
					// Блокируем пользователя
					await prisma.user.update({
						where: { id: userId },
						data: { isBlocked: true }
					});
					
					// Отправляем уведомление об успешной блокировке
					await query.answerCbQuery('✅ Пользователь заблокирован', { show_alert: true });
					
					// Получаем обновленную информацию о пользователе
					const user = await prisma.user.findFirst({
						where: { id: userId },
						include: { wallet: true }
					});
					
					if (!user) {
						return query.editMessageText(
							'❌ Пользователь не найден',
							{
								reply_markup: {
									inline_keyboard: [previousButton('admin-users')]
								}
							}
						);
					}
					
					// Получаем информацию о замороженных средствах
					const frozenInfo = await frozenBalanceService.checkAvailableBalance(
						userId,
						0 // 0, так как нам не нужно проверять доступность для определенной суммы
					);
					
					// Считаем количество контрактов
					const contractCount = await prisma.contract.count({
						where: { userId: userId }
					});
					
					// Считаем количество транзакций (как покупатель + как продавец)
					const buyerTransactionCount = await prisma.contractTransaction.count({
						where: { buyerId: userId }
					});
					const sellerTransactionCount = await prisma.contractTransaction.count({
						where: { sellerId: userId }
					});
					const transactionCount = buyerTransactionCount + sellerTransactionCount;
					
					// Форматируем даты
					const registeredAt = new Date(user.createdAt).toLocaleString('ru-RU');
					const updatedAt = new Date(user.createdAt).toLocaleString('ru-RU'); // Используем createdAt вместо updatedAt
					
					// Создаем кнопки действий для пользователя
					const actionButtons = [];
					
					// Кнопка разблокировки пользователя
					actionButtons.push([{
						callback_data: `admin-user-unblock-${user.id}`,
						text: '🔓 Разблокировать пользователя'
					}]);
					
					// Кнопка замораживания/размораживания переводов
					actionButtons.push([{
						callback_data: user.isFreezeTransfer
							? `admin-user-unfreeze-transfer-${user.id}`
							: `admin-user-freeze-transfer-${user.id}`,
						text: user.isFreezeTransfer
							? '💲 Разрешить переводы'
							: '❄️ Заморозить переводы'
					}]);
					
					// Кнопка назад к списку пользователей
					actionButtons.push(previousButton('admin-users'));
					
					return query.editMessageText(
						`👤 <b>Информация о пользователе</b>\n\n` +
						`ID: <code>${user.id}</code>\n` +
						`Имя пользователя: <b>${user.username || 'Не указано'}</b>\n` +
						`Логин: <b>${user.login || 'Не указан'}</b>\n` +
						`Статус: ${user.isAdmin ? '👑 Администратор' : '👤 Пользователь'} 🔒 Заблокирован\n` +
						`Переводы: ${user.isFreezeTransfer ? '❄️ Заморожены' : '✅ Разрешены'}\n\n` +
						`💰 <b>Баланс</b>\n` +
						`• Общий баланс: <b>${frozenInfo.totalBalance.toFixed(8)} BTC</b>\n` +
						`• Доступный баланс: <b>${frozenInfo.availableBalance.toFixed(8)} BTC</b>\n` +
						`• Замороженный баланс: <b>${frozenInfo.frozenBalance.toFixed(8)} BTC</b>\n\n` +
						`📊 <b>Статистика</b>\n` +
						`• Количество сделок: <b>${transactionCount}</b>\n` +
						`• Количество объявлений: <b>${contractCount}</b>\n\n` +
						`⏰ <b>Время</b>\n` +
						`• Дата регистрации: <b>${registeredAt}</b>\n` +
						`• Последнее обновление: <b>${updatedAt}</b>`,
						{
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: actionButtons
							}
						}
					);
				} catch (error) {
					console.error('[ADMIN_USER_BLOCK] Error:', error);
					return query.answerCbQuery('❌ Ошибка при блокировке пользователя', { show_alert: true });
				}
			}
			
			// Обработка разблокировки пользователя
			if (matchUserUnblock) {
				try {
					const userId = matchUserUnblock[1];
					
					// Разблокируем пользователя
					await prisma.user.update({
						where: { id: userId },
						data: { isBlocked: false }
					});
					
					// Отправляем уведомление об успешной разблокировке
					await query.answerCbQuery('✅ Пользователь разблокирован', { show_alert: true });
					
					// Получаем обновленную информацию о пользователе
					const user = await prisma.user.findFirst({
						where: { id: userId },
						include: { wallet: true }
					});
					
					if (!user) {
						return query.editMessageText(
							'❌ Пользователь не найден',
							{
								reply_markup: {
									inline_keyboard: [previousButton('admin-users')]
								}
							}
						);
					}
					
					// Получаем информацию о замороженных средствах
					const frozenInfo = await frozenBalanceService.checkAvailableBalance(
						userId,
						0 // 0, так как нам не нужно проверять доступность для определенной суммы
					);
					
					// Считаем количество контрактов
					const contractCount = await prisma.contract.count({
						where: { userId: userId }
					});
					
					// Считаем количество транзакций (как покупатель + как продавец)
					const buyerTransactionCount = await prisma.contractTransaction.count({
						where: { buyerId: userId }
					});
					const sellerTransactionCount = await prisma.contractTransaction.count({
						where: { sellerId: userId }
					});
					const transactionCount = buyerTransactionCount + sellerTransactionCount;
					
					// Форматируем даты
					const registeredAt = new Date(user.createdAt).toLocaleString('ru-RU');
					const updatedAt = new Date(user.createdAt).toLocaleString('ru-RU'); // Используем createdAt вместо updatedAt
					
					// Создаем кнопки действий для пользователя
					const actionButtons = [];
					
					// Кнопка блокировки пользователя
					actionButtons.push([{
						callback_data: `admin-user-block-${user.id}`,
						text: '🔒 Заблокировать пользователя'
					}]);
					
					// Кнопка замораживания/размораживания переводов
					actionButtons.push([{
						callback_data: user.isFreezeTransfer
							? `admin-user-unfreeze-transfer-${user.id}`
							: `admin-user-freeze-transfer-${user.id}`,
						text: user.isFreezeTransfer
							? '💲 Разрешить переводы'
							: '❄️ Заморозить переводы'
					}]);
					
					// Кнопка назад к списку пользователей
					actionButtons.push(previousButton('admin-users'));
					
					return query.editMessageText(
						`👤 <b>Информация о пользователе</b>\n\n` +
						`ID: <code>${user.id}</code>\n` +
						`Имя пользователя: <b>${user.username || 'Не указано'}</b>\n` +
						`Логин: <b>${user.login || 'Не указан'}</b>\n` +
						`Статус: ${user.isAdmin ? '👑 Администратор' : '👤 Пользователь'}\n` +
						`Переводы: ${user.isFreezeTransfer ? '❄️ Заморожены' : '✅ Разрешены'}\n\n` +
						`💰 <b>Баланс</b>\n` +
						`• Общий баланс: <b>${frozenInfo.totalBalance.toFixed(8)} BTC</b>\n` +
						`• Доступный баланс: <b>${frozenInfo.availableBalance.toFixed(8)} BTC</b>\n` +
						`• Замороженный баланс: <b>${frozenInfo.frozenBalance.toFixed(8)} BTC</b>\n\n` +
						`📊 <b>Статистика</b>\n` +
						`• Количество сделок: <b>${transactionCount}</b>\n` +
						`• Количество объявлений: <b>${contractCount}</b>\n\n` +
						`⏰ <b>Время</b>\n` +
						`• Дата регистрации: <b>${registeredAt}</b>\n` +
						`• Последнее обновление: <b>${updatedAt}</b>`,
						{
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: actionButtons
							}
						}
					);
				} catch (error) {
					console.error('[ADMIN_USER_UNBLOCK] Error:', error);
					return query.answerCbQuery('❌ Ошибка при разблокировке пользователя', { show_alert: true });
				}
			}
			
			// Обработка замораживания переводов пользователя
			if (matchUserFreezeTransfer) {
				try {
					const userId = matchUserFreezeTransfer[1];
					
					// Замораживаем переводы пользователя
					await prisma.user.update({
						where: { id: userId },
						data: { isFreezeTransfer: true }
					});
					
					// Отправляем уведомление об успешном замораживании администратору
					await query.answerCbQuery('✅ Переводы пользователя заморожены', { show_alert: true });
					
					// Отправляем уведомление пользователю
					await query.telegram.sendMessage(
						userId,
						`❄️ <b>Ваши переводы заморожены</b>\n\nУважаемый пользователь, администрация ${config.shopName} временно заморозила возможность вывода BTC на внешние кошельки.\n\nЭто означает, что вы не сможете выводить криптовалюту за пределы платформы до разморозки переводов.\n\nОбратите внимание:\n• Внутренние операции в системе по-прежнему доступны\n• Покупка и продажа BTC внутри системы работает в обычном режиме\n• Ваши средства полностью сохранены\n\nПо всем вопросам обращайтесь в службу поддержки.`,
						{
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: [
									[{ text: '🛎 Связаться с поддержкой', callback_data: 'support' }]
								]
							}
						}
					);
					
					// Получаем обновленную информацию о пользователе
					const user = await prisma.user.findFirst({
						where: { id: userId },
						include: { wallet: true }
					});
					
					if (!user) {
						return query.editMessageText(
							'❌ Пользователь не найден',
							{
								reply_markup: {
									inline_keyboard: [previousButton('admin-users')]
								}
							}
						);
					}
					
					// Получаем информацию о замороженных средствах
					const frozenInfo = await frozenBalanceService.checkAvailableBalance(
						userId,
						0 // 0, так как нам не нужно проверять доступность для определенной суммы
					);
					
					// Считаем количество контрактов
					const contractCount = await prisma.contract.count({
						where: { userId: userId }
					});
					
					// Считаем количество транзакций (как покупатель + как продавец)
					const buyerTransactionCount = await prisma.contractTransaction.count({
						where: { buyerId: userId }
					});
					const sellerTransactionCount = await prisma.contractTransaction.count({
						where: { sellerId: userId }
					});
					const transactionCount = buyerTransactionCount + sellerTransactionCount;
					
					// Форматируем даты
					const registeredAt = new Date(user.createdAt).toLocaleString('ru-RU');
					const updatedAt = new Date(user.createdAt).toLocaleString('ru-RU'); // Используем createdAt вместо updatedAt
					
					// Создаем кнопки действий для пользователя
					const actionButtons = [];
					
					// Кнопка блокировки/разблокировки пользователя
					actionButtons.push([{
						callback_data: user.isBlocked 
							? `admin-user-unblock-${user.id}` 
							: `admin-user-block-${user.id}`,
						text: user.isBlocked 
							? '🔓 Разблокировать пользователя' 
							: '🔒 Заблокировать пользователя'
					}]);
					
					// Кнопка размораживания переводов
					actionButtons.push([{
						callback_data: `admin-user-unfreeze-transfer-${user.id}`,
						text: '💲 Разрешить переводы'
					}]);
					
					// Кнопка назад к списку пользователей
					actionButtons.push(previousButton('admin-users'));
					
					return query.editMessageText(
						`👤 <b>Информация о пользователе</b>\n\n` +
						`ID: <code>${user.id}</code>\n` +
						`Имя пользователя: <b>${user.username || 'Не указано'}</b>\n` +
						`Логин: <b>${user.login || 'Не указан'}</b>\n` +
						`Статус: ${user.isAdmin ? '👑 Администратор' : '👤 Пользователь'}${user.isBlocked ? ' 🔒 Заблокирован' : ''}\n` +
						`Переводы: ❄️ Заморожены\n\n` +
						`💰 <b>Баланс</b>\n` +
						`• Общий баланс: <b>${frozenInfo.totalBalance.toFixed(8)} BTC</b>\n` +
						`• Доступный баланс: <b>${frozenInfo.availableBalance.toFixed(8)} BTC</b>\n` +
						`• Замороженный баланс: <b>${frozenInfo.frozenBalance.toFixed(8)} BTC</b>\n\n` +
						`📊 <b>Статистика</b>\n` +
						`• Количество сделок: <b>${transactionCount}</b>\n` +
						`• Количество объявлений: <b>${contractCount}</b>\n\n` +
						`⏰ <b>Время</b>\n` +
						`• Дата регистрации: <b>${registeredAt}</b>\n` +
						`• Последнее обновление: <b>${updatedAt}</b>`,
						{
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: actionButtons
							}
						}
					);
				} catch (error) {
					console.error('[ADMIN_USER_FREEZE_TRANSFER] Error:', error);
					return query.answerCbQuery('❌ Ошибка при замораживании переводов', { show_alert: true });
				}
			}
			
			// Обработка размораживания переводов пользователя
			if (matchUserUnfreezeTransfer) {
				try {
					const userId = matchUserUnfreezeTransfer[1];
					
					// Размораживаем переводы пользователя
					await prisma.user.update({
						where: { id: userId },
						data: { isFreezeTransfer: false }
					});
					
					// Отправляем уведомление об успешном размораживании
					await query.answerCbQuery('✅ Переводы пользователя разрешены', { show_alert: true });
					
					// Отправляем уведомление пользователю
					await query.telegram.sendMessage(
						userId,
						`✅ <b>Ваши переводы разблокированы</b>\n\nУважаемый пользователь, администрация ${config.shopName} разблокировала возможность вывода BTC на внешние кошельки.\n\nТеперь вы снова можете пользоваться всеми функциями кошелька без ограничений:\n• Выводить BTC на внешние кошельки\n• Совершать переводы между пользователями\n• Покупать и продавать BTC внутри системы\n\nСпасибо за понимание и использование нашего сервиса!`,
						{
							parse_mode: 'HTML'
						}
					);
					
					// Получаем обновленную информацию о пользователе
					const user = await prisma.user.findFirst({
						where: { id: userId },
						include: { wallet: true }
					});
					
					if (!user) {
						return query.editMessageText(
							'❌ Пользователь не найден',
							{
								reply_markup: {
									inline_keyboard: [previousButton('admin-users')]
								}
							}
						);
					}
					
					// Получаем информацию о замороженных средствах
					const frozenInfo = await frozenBalanceService.checkAvailableBalance(
						userId,
						0 // 0, так как нам не нужно проверять доступность для определенной суммы
					);
					
					// Считаем количество контрактов
					const contractCount = await prisma.contract.count({
						where: { userId: userId }
					});
					
					// Считаем количество транзакций (как покупатель + как продавец)
					const buyerTransactionCount = await prisma.contractTransaction.count({
						where: { buyerId: userId }
					});
					const sellerTransactionCount = await prisma.contractTransaction.count({
						where: { sellerId: userId }
					});
					const transactionCount = buyerTransactionCount + sellerTransactionCount;
					
					// Форматируем даты
					const registeredAt = new Date(user.createdAt).toLocaleString('ru-RU');
					const updatedAt = new Date(user.updatedAt).toLocaleString('ru-RU');
					
					// Создаем кнопки действий для пользователя
					const actionButtons = [];
					
					// Кнопка блокировки/разблокировки пользователя
					actionButtons.push([{
						callback_data: user.isBlocked 
							? `admin-user-unblock-${user.id}` 
							: `admin-user-block-${user.id}`,
						text: user.isBlocked 
							? '🔓 Разблокировать пользователя' 
							: '🔒 Заблокировать пользователя'
					}]);
					
					// Кнопка замораживания переводов
					actionButtons.push([{
						callback_data: `admin-user-freeze-transfer-${user.id}`,
						text: '❄️ Заморозить переводы'
					}]);
					
					// Кнопка назад к списку пользователей
					actionButtons.push(previousButton('admin-users'));
					
					return query.editMessageText(
						`👤 <b>Информация о пользователе</b>\n\n` +
						`ID: <code>${user.id}</code>\n` +
						`Имя пользователя: <b>${user.username || 'Не указано'}</b>\n` +
						`Логин: <b>${user.login || 'Не указан'}</b>\n` +
						`Статус: ${user.isAdmin ? '👑 Администратор' : '👤 Пользователь'}${user.isBlocked ? ' 🔒 Заблокирован' : ''}\n` +
						`Переводы: ✅ Разрешены\n\n` +
						`💰 <b>Баланс</b>\n` +
						`• Общий баланс: <b>${frozenInfo.totalBalance.toFixed(8)} BTC</b>\n` +
						`• Доступный баланс: <b>${frozenInfo.availableBalance.toFixed(8)} BTC</b>\n` +
						`• Замороженный баланс: <b>${frozenInfo.frozenBalance.toFixed(8)} BTC</b>\n\n` +
						`📊 <b>Статистика</b>\n` +
						`• Количество сделок: <b>${transactionCount}</b>\n` +
						`• Количество объявлений: <b>${contractCount}</b>\n\n` +
						`⏰ <b>Время</b>\n` +
						`• Дата регистрации: <b>${registeredAt}</b>\n` +
						`• Последнее обновление: <b>${updatedAt}</b>`,
						{
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: actionButtons
							}
						}
					);
				} catch (error) {
					console.error('[ADMIN_USER_UNFREEZE_TRANSFER] Error:', error);
					return query.answerCbQuery('❌ Ошибка при разрешении переводов', { show_alert: true });
				}
			}
			
			// Обработка пагинации списка пользователей
			if (matchUsersPagination) {
				try {
					const page = parseInt(matchUsersPagination[1]);
					const usersPerPage = 5;
					const totalUsers = await prisma.user.count();
					const totalPages = Math.ceil(totalUsers / usersPerPage);
					
					// Проверяем, что страница находится в допустимом диапазоне
					if (page < 1 || page > totalPages) {
						return query.answerCbQuery('❌ Неверный номер страницы', { show_alert: true });
					}
					
					// Получаем пользователей для текущей страницы
					const users = await prisma.user.findMany({
						skip: (page - 1) * usersPerPage,
						take: usersPerPage,
						orderBy: { createdAt: 'desc' },
						include: { wallet: true }
					});
					
					// Формируем кнопки пользователей
					const userButtons = users.map(user => [
						{
							callback_data: `admin-user-details-${user.id}`,
							text: `${user.isBlocked ? '🔒 ' : ''}${user.username || 'Нет имени'} ${user.isAdmin ? '👑' : ''} | ${user.wallet?.balance || 0} BTC`
						}
					]);
					
					// Добавляем кнопки пагинации
					const paginationButtons = [];
					
					// Кнопка "Назад" (неактивна на первой странице)
					if (page > 1) {
						paginationButtons.push({
							callback_data: `admin-users-page-${page - 1}`,
							text: '◀️ Назад'
						});
					}
					
					// Номер текущей страницы и общее количество
					paginationButtons.push({
						callback_data: 'none',
						text: `${page} из ${totalPages}`
					});
					
					// Кнопка "Вперед" (неактивна на последней странице)
					if (page < totalPages) {
						paginationButtons.push({
							callback_data: `admin-users-page-${page + 1}`,
							text: 'Вперед ▶️'
						});
					}
					
					userButtons.push(paginationButtons);
					
					// Кнопка возврата в админ-панель
					userButtons.push(previousButton('admin-panel'));
					
					return query.editMessageText(
						`👥 <b>Управление пользователями</b>\n\n` +
						`Всего пользователей: <b>${totalUsers}</b>\n` +
						`Страница <b>${page}</b> из <b>${totalPages}</b>\n\n` +
						`Выберите пользователя для просмотра информации:`,
						{
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: userButtons
							}
						}
					);
				} catch (error) {
					console.error('[ADMIN_USERS_PAGINATION] Error:', error);
					return query.answerCbQuery('❌ Ошибка при получении списка пользователей', { show_alert: true });
				}
			}
			
			if (matchBuyContract) {
				const itemId = Number(matchBuyContract[1])
				
				// Найдем контракт
				const contract = await prisma.contract.findFirst({
					where: {
						id: itemId,
					},
					include: {
						author: true
					}
				});
				
				// Проверка, что пользователь не пытается купить у самого себя
				if (contract?.author.id === query.from.id.toString()) {
					return query.answerCbQuery('❌ Вы не можете торговать с самим собой', {
						show_alert: true
					});
				}
				
				// @ts-ignore
				query.scene.state.contractId = itemId
				const user = await userService.fetchOneById({
					id: query!.from.id!
				})
				const userBalance = await currencyService.convertRubleToBTC(user!.wallet!.balance)

				await prisma.contract
					.findFirst({
						where: {
							id: itemId,
						},
						include: {
							author: {
								include: {
									SellerContractTransaction: true,
								},
							},
							paymentMethod: true,
						},
					})
					.then(async response => {
						const isAccept = userBalance > response!.price
						if (!isAccept) {
							return query.answerCbQuery('Ваш баланс меньше чем минимальный лимит сделки, пополните баланс для совершения сделки.', {
								show_alert: true
							})
						}
						const buttonText = response?.type === 'buy' ? 'Продать' : 'Купить'
						const config = await prisma.config.findFirst()
						return query.editMessageText(
							`📜 ID: #${response?.code}\n\nЦена за 1 BTC: ${currencyFormatter(
								response?.amount!,
								response?.currency!
							)}\n\n!Время на оплату сделки: 15 минут\n\nТрейдер: /${response?.author.login
							}\nОтзывы: 😊(0) 🙁(0)\n\nЗарегистрирован: ${dateFormat(
								response?.author.createdAt!
							)}\n\nУсловия:\nМинимальная сумма - ${currencyFormatter(
								response!.price!,
								response?.currency!
							)}\nМаксимальная сумма - ${currencyFormatter(
								response!.maxPrice!,
								response?.currency!
							)}`,
							{
								parse_mode: 'HTML',
								reply_markup: {
									inline_keyboard: [
										[
											{
												callback_data: `buy_contract`,
												text: `✅ ${buttonText}`,
											},
										],
										previousButton('sell'),
									],
								},
							}
						)
					})
			}
			if (matchCancelTransaction) {
				console.log('[CALLBACK_HANDLER] Received cancel-transaction callback');
				console.log('[CALLBACK_HANDLER] Callback data:', data);
				console.log('[CALLBACK_HANDLER] Match result:', matchCancelTransaction);
				console.log('[CALLBACK_HANDLER] Transaction ID:', matchCancelTransaction[1]);
				
				// Попробуем найти транзакцию напрямую перед вызовом действия
				const transaction = await prisma.contractTransaction.findFirst({
					where: {
						id: matchCancelTransaction[1]
					}
				});
				
				console.log('[CALLBACK_HANDLER] Transaction found directly:', transaction ? 'Yes' : 'No');
				
				// Создаем копию контекста с явно установленным match
				const ctxWithMatch = {
					...query,
					match: matchCancelTransaction
				};
				
				return cancelTransactionAction(ctxWithMatch);
			}
			if (matchPaymentSuccessful) {
				const itemId = Number(matchPaymentSuccessful[1])
				const transaction = await prisma.contractTransaction.findFirst({
					where: {
						buyerId: itemId.toString(),
					},
					include: {
						buyer: {
							include: {
								wallet: true,
							},
						},
						seller: {
							include: {
								wallet: true,
							},
						},
						contract: true,
					},
				})
				if (transaction) {
					const coins = await currencyService.convertRubleToBTC(transaction.amount, query.session.currentCurrency, 'CURRENCY')
					const coinsWithFee = await calculationFee(coins)
					await prisma.contractTransaction.delete({
						where: {
							id: transaction.id,
						},
					})
					await prisma.contract.delete({
						where: {
							id: transaction.contract.id,
						},
					})
					// @ts-ignore
					query.session.sellerId = null
					// @ts-ignore
					query.session.buyerId = null
					await query.telegram.sendMessage(
						itemId,
						`Продавец /${transaction.seller!.login
						} подтвердил получение денежных средств по сделке #${transaction.code
						}, ожидайте поступления ${coinsWithFee.valueWithFee
						} BTC на ваш счет`
					)
					await query.reply(
						`Вы подтвердили получение денежных средств, ${coinsWithFee.valueWithFee
						} BTC будут списаны с вашего счета и начислены пользователю /${transaction.buyer!.login
						}`
					)
					if (query.session.tradeAction === 'buy') {
						await userService.changeUserBalance({
							params: {
								id: transaction.buyer!.id,
							},
							value:
								transaction!.buyer!.wallet!.balance - coinsWithFee.valueWithFee,
						})
						await userService.changeUserBalance({
							params: {
								id: transaction.seller!.id,
							},
							value:
								transaction!.seller!.wallet!.balance + coinsWithFee.valueWithFee,
						})
					} else {
						await userService.changeUserBalance({
							params: {
								id: transaction.seller!.id,
							},
							value:
								transaction!.seller!.wallet!.balance - coinsWithFee.valueWithFee,
						})
						await userService.changeUserBalance({
							params: {
								id: transaction.buyer!.id,
							},
							value:
								transaction!.buyer!.wallet!.balance + coinsWithFee.valueWithFee,
						})
					}
				}
			}
			if (matchPaymentContract) {
				const tradeAction = query.session.tradeAction
				const itemId = Number(matchPaymentContract[1])
				const user = await prisma.user.findFirst({
					where: {
						id: itemId.toString(),
					},
					include: {
						BuyerContractTransaction: {
							include: {
								contract: true,
							},
						},
					},
				})
				const userSendId = user.BuyerContractTransaction.contract.type === 'sell' ? user?.BuyerContractTransaction?.sellerId! : user?.BuyerContractTransaction?.buyerId!
				console.log(userSendId, user?.BuyerContractTransaction?.sellerId!, user?.BuyerContractTransaction?.buyerId!)
				await query.telegram.sendMessage(
					userSendId,
					`Пользователь /${user?.login} произвел оплату по сделке #${user?.BuyerContractTransaction?.code}`,
					{
						parse_mode: 'HTML',
						reply_markup: {
							inline_keyboard: [
								[
									{
										callback_data: `payment-successful-${user?.BuyerContractTransaction?.buyerId}`,
										text: '✅ Деньги получены',
									},
									{
										callback_data: `send-message-${user?.BuyerContractTransaction?.buyerId}`,
										text: '✉️ Ответить',
									},
								],
								disputeModule.getDisputeButton('open')
							],
						},
					}
				)
			}
			if (matchSendMessageTo) {
				const itemId = Number(matchSendMessageTo[1])
				return query.scene.enter('send_message', {
					id: itemId,
				})
			}
			
			// Обработка ответа на тикет от пользователя
			const matchReplyTicket = data.match(/^reply-ticket-(\d+)$/)
			if (matchReplyTicket) {
				const ticketId = Number(matchReplyTicket[1])
				
				// Проверяем существование тикета
				const ticket = await prisma.ticket.findFirst({
					where: {
						id: ticketId,
						initiator: {
							id: query.from!.id.toString()
						},
						status: 'REVIEW'
					},
					include: {
						initiator: true,
						performer: true
					}
				})
				
				if (!ticket) {
					return query.answerCbQuery(
						'Вы не можете ответить на этот тикет. Возможно, он уже закрыт.',
						{ show_alert: true }
					)
				}
				
				// Сохраняем ID тикета в сессии
				await query.answerCbQuery()
				// @ts-ignore
				query.session.ticketReply = {
					ticketId: ticketId
				}
				
				// Запускаем сцену ответа пользователя
				return query.scene.enter('reply-to-support')
			}
			if (matchSellContract) {
				const itemId = Number(matchSellContract[1])
				
				// Найдем контракт
				const contract = await prisma.contract.findFirst({
					where: {
						id: itemId,
					},
					include: {
						author: true
					}
				});
				
				// Проверка, что пользователь не пытается продать самому себе
				if (contract?.author.id === query.from.id.toString()) {
					return query.answerCbQuery('❌ Вы не можете торговать с самим собой', {
						show_alert: true
					});
				}
				
				// @ts-ignore
				query.scene.state.contractId = itemId
				await prisma.contract
					.findFirst({
						where: {
							id: itemId,
						},
						include: {
							author: {
								include: {
									SellerContractTransaction: true,
								},
							},
							paymentMethod: true,
						},
					})
					.then(async response => {
						// if (response!.author.id === String(query.from.id)) {
						// 	return query.answerCbQuery(
						// 		'🚫 Вы не можете торговать с самим собой',
						// 		{
						// 			show_alert: true,
						// 		}
						// 	)
						// }
						const buttonText = response?.type === 'buy' ? 'Продать' : 'Купить'
						const config = await prisma.config.findFirst()

						return query.editMessageText(
							`📜 ID: #${response?.code}\n\nЦена за 1 BTC: ${currencyFormatter(
								response?.amount!,
								response?.currency!
							)}\n\nВремя на оплату сделки: 15 минут\n\nТрейдер: /${response?.author.login
							}\nРепутация: 100%️\nОтзывы: 😊(0) 🙁(0)\n\nЗарегистрирован: ${dateFormat(
								response?.author.createdAt!
							)}\n\nУсловия:\nМинимальная сумма - ${currencyFormatter(
								response!.price!,
								response?.currency!
							)}\nМаксимальная сумма - ${currencyFormatter(
								response!.maxPrice!,
								response?.currency!
							)}`,
							{
								parse_mode: 'HTML',
								reply_markup: {
									inline_keyboard: [
										[
											{
												callback_data: `buy_contract`,
												text: `✅ ${buttonText}`,
											},
										],
										previousButton('sell'),
									],
								},
							}
						)
					})
			}
			if (matchDeleteRequisite) {
				const itemId = Number(matchDeleteRequisite[1])
				await prisma.requisite.delete({
					where: {
						id: itemId,
					},
				})
				await query.editMessageText(`Реквизиты удалены.`, {
					parse_mode: 'HTML',
					reply_markup: {
						inline_keyboard: [previousButton('requisites')],
					},
				})
			}
			if (matchDeleteContract) {
				const itemId = Number(matchDeleteContract[1])
				
				// Получаем контракт с дополнительной информацией
				const contractToDelete = await prisma.contract.findFirst({
					where: {
						id: itemId
					},
					include: {
						author: {
							include: {
								wallet: true
							}
						}
					}
				});
				
				if (!contractToDelete) {
					return query.answerCbQuery('Контракт не найден', { show_alert: true });
				}
				
				// Получаем информацию о замороженных средствах до удаления
				let frozenInfo = null;
				
				// Если контракт типа "sell", нужно разморозить BTC
				if (contractToDelete.type === 'sell') {
					console.log(`[CONTRACT_DELETE] Unfreezing ${contractToDelete.amount} BTC for contract #${contractToDelete.id}`);
					
					// Получаем текущее состояние замороженных средств
					frozenInfo = await frozenBalanceService.checkAvailableBalance(
						contractToDelete.author.id,
						0 // 0, так как нам не нужно проверять доступность для определенной суммы
					);
					
					console.log(`[CONTRACT_DELETE] Before unfreezing - Total: ${frozenInfo.totalBalance}, Frozen: ${frozenInfo.frozenBalance}, Available: ${frozenInfo.availableBalance}`);
				}
				
				// Удаляем контракт
				await prisma.contract
					.delete({
						where: {
							id: itemId,
						},
					})
					.then(async (res) => {
						let message = `Заявка <a>#${res.id}</a> удалена`;
						
						// Если контракт типа "sell", добавляем информацию о размороженных BTC
						if (res.type === 'sell') {
							// Получаем обновленное состояние
							const updatedFrozenInfo = await frozenBalanceService.checkAvailableBalance(
								contractToDelete.author.id,
								0
							);
							
							message += `\n\n🧊 <b>Информация о средствах:</b>\n` +
								`• Разморожено: ${res.amount.toFixed(8)} BTC\n` +
								`• Общий баланс: ${updatedFrozenInfo.totalBalance.toFixed(8)} BTC\n` +
								`• Ещё заморожено: ${updatedFrozenInfo.frozenBalance.toFixed(8)} BTC\n` +
								`• Доступно сейчас: ${updatedFrozenInfo.availableBalance.toFixed(8)} BTC`;
							
							console.log(`[CONTRACT_DELETE] After unfreezing - Total: ${updatedFrozenInfo.totalBalance}, Frozen: ${updatedFrozenInfo.frozenBalance}, Available: ${updatedFrozenInfo.availableBalance}`);
						}
						
						return query.editMessageText(message, {
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: [previousButton('my_ads')],
							},
						});
					})
			}
			if (matchSellPaymentMethod) {
				const itemId = Number(matchSellPaymentMethod[1])
				const user = await prisma.user.findFirst({
					where: {
						id: query.from.id.toString(),
					},
					include: {
						Requisite: {
							include: {
								paymentMethod: true,
							},
						},
					},
				})
				const paymentMethod = await prisma.paymentMethod.findFirst({
					where: {
						id: itemId,
					},
				})
				const contracts = await prisma.contract.findMany({
					where: {
						paymentMethodId: paymentMethod?.id,
						type: 'sell',
					},
					include: {
						author: true,
					},
				})
				console.log(contracts)
				const contractsButtons: InlineKeyboardButton[][] = contracts.map(
					contract => {
						return [
							{
								callback_data: `sell_contract_${contract.id}`,
								text: `${contract.author.username} | ${currencyFormatter(
									contract.amount,
									contract.currency!
								)} | ${currencyFormatter(
									contract.price,
									contract.currency!
								)} - ${currencyFormatter(
									contract.maxPrice!,
									contract.currency!
								)}`,
							},
						]
					}
				)
				return query.editMessageText(
					`💳 Здесь вы можете купить BTC за RUB через ${paymentMethod?.name}.`,
					{
						parse_mode: 'HTML',
						reply_markup: {
							inline_keyboard: [...contractsButtons, previousButton('sell')],
						},
					}
				)
			}
			if (matchBuyPaymentMethod) {
				const itemId = Number(matchBuyPaymentMethod[1])

				const paymentMethod = await prisma.paymentMethod.findFirst({
					where: {
						id: itemId,
					},
				})
				const contracts = await prisma.contract.findMany({
					where: {
						paymentMethodId: paymentMethod?.id,
						type: 'buy',
					},
					include: {
						author: true,
					},
				})
				const contractsButtons: InlineKeyboardButton[][] = contracts.map(
					contract => {
						return [
							{
								callback_data: `buy_contract_${contract.id}`,
								text: `${contract.author.username} | ${currencyFormatter(
									contract.amount,
									contract.currency!
								)} | ${currencyFormatter(
									contract.price,
									contract.currency!
								)} - ${currencyFormatter(
									contract.maxPrice!,
									contract.currency!
								)}`,
							},
						]
					}
				)
				return query.editMessageText(
					`💳 Здесь вы можете продать BTC за RUB через ${paymentMethod?.name}.`,
					{
						parse_mode: 'HTML',
						reply_markup: {
							inline_keyboard: [...contractsButtons, previousButton('buy')],
						},
					}
				)
			}
			if (matchRequisite) {
				const itemId = matchRequisite[1]
				const requisite = await prisma.requisite.findFirst({
					where: {
						id: Number(itemId),
					},
					include: {
						paymentMethod: true,
					},
				})
				// Здесь вы можете выполнить действия с вашим itemId
				if (requisite) {
					await query.editMessageText(
						`<b>Платёжные реквизиты</b>\n\nТип операции: <code>Банковский перевод</code>\nВалюта: <code>${requisite.currency}</code>\nСпособ оплаты: <code>${requisite.paymentMethod.name}</code>\nРеквизиты: <code>${requisite.phoneOrbankCardNumber}</code>`,
						{
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: [
									[
										{
											callback_data: `delete_requisite_${requisite.id}`,
											text: '❌ Удалить реквизиты',
										},
									],
									previousButton('requisites'),
								],
							},
						}
					)
				}
			}
		} catch (error) {
			console.log(error)
			return query.reply('❗️ Произошла непредвиденная ошибка')
		}
	})
}
