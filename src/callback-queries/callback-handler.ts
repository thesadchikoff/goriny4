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
import { getAdminType, isMasterAdmin } from '@/utils/admin-id.utils';

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
									inline_keyboard: inlineKeyboardForSettings(user?.isAdmin!, user?.isBtcSubscribed || false),
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
				case 'btc-subscribe':
					try {
						// @ts-ignore
						const userId = query.update.callback_query.from.id.toString();
						
						console.log(`[BTC_SUBSCRIBE] User ${userId} subscribing to BTC rate notifications`);
						
						// Обновляем статус подписки в базе данных
						await prisma.user.update({
							where: { id: userId },
							data: { isBtcSubscribed: true }
						});
						
						console.log(`[BTC_SUBSCRIBE] Successfully updated subscription status for user ${userId}`);
						
						// Получаем текущий курс BTC для отображения
						const currentRate = await currencyService.getCurrentBTCRate('usd');
						
						// Отправляем сообщение об успешной подписке
						await query.answerCbQuery('✅ Вы успешно подписались на уведомления об изменении курса BTC', { show_alert: true });
						
						// Получаем данные пользователя
						const updatedUser = await prisma.user.findUnique({
							where: { id: userId }
						});
						
						if (!updatedUser) {
							return query.editMessageText(
								'❌ Произошла ошибка при получении данных пользователя', 
								{
									reply_markup: {
										inline_keyboard: inlineKeyboardForSettings(false)
									}
								}
							);
						}
						
						// Обновляем меню настроек с учетом подписки
						return query.editMessageText(
							`<b>🔧 ${config.shopName} | Настройки</b>\n\nВы успешно подписались на уведомления об изменении курса BTC.\n\nТекущий курс: <b>${currentRate ? currentRate.toFixed(2) : 'Н/Д'}$</b>`,
							{
								parse_mode: 'HTML',
								reply_markup: {
									inline_keyboard: inlineKeyboardForSettings(updatedUser.isAdmin, true)
								}
							}
						);
					} catch (error) {
						console.error('[BTC_SUBSCRIBE] Error:', error);
						return query.answerCbQuery('❌ Произошла ошибка при подписке на курс BTC', { show_alert: true });
					}
					break;
				case 'btc-unsubscribe':
					try {
						// @ts-ignore
						const userId = query.update.callback_query.from.id.toString();
						
						// Обновляем статус подписки в базе данных
						await prisma.user.update({
							where: { id: userId },
							data: { isBtcSubscribed: false }
						});
						
						// Отправляем сообщение об успешной отписке
						await query.answerCbQuery('✅ Вы успешно отписались от уведомлений об изменении курса BTC', { show_alert: true });
						
						// Получаем данные пользователя
						const updatedUser = await prisma.user.findUnique({
							where: { id: userId }
						});
						
						if (!updatedUser) {
							return query.editMessageText(
								'❌ Произошла ошибка при получении данных пользователя', 
								{
									reply_markup: {
										inline_keyboard: inlineKeyboardForSettings(false)
									}
								}
							);
						}
						
						// Обновляем меню настроек с учетом отписки
						return query.editMessageText(
							`<b>🔧 ${config.shopName} | Настройки</b>\n\nВы отписались от уведомлений об изменении курса BTC.`,
							{
								parse_mode: 'HTML',
								reply_markup: {
									inline_keyboard: inlineKeyboardForSettings(updatedUser.isAdmin, false)
								}
							}
						);
					} catch (error) {
						console.error('[BTC_UNSUBSCRIBE] Error:', error);
						return query.answerCbQuery('❌ Произошла ошибка при отписке от курса BTC', { show_alert: true });
					}
					break;
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
			const matchUserSetAdmin = data.match(/^admin-user-set-admin-(\d+)$/)
			const matchUserRemoveAdmin = data.match(/^admin-user-remove-admin-(\d+)$/)

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
					
					// Кнопка назначения/снятия прав администратора
					if (!user.isAdmin) {
						// Если пользователь не админ, показываем кнопку назначения админом
						actionButtons.push([{
							callback_data: `admin-user-set-admin-${user.id}`,
							text: '👑 Назначить администратором'
						}]);
					} else if (!isMasterAdmin(user.id)) {
						// Если пользователь админ, но не мастер-админ, показываем кнопку снятия прав
						actionButtons.push([{
							callback_data: `admin-user-remove-admin-${user.id}`,
							text: '👤 Снять права администратора'
						}]);
					}
					
					// Кнопка назад к списку пользователей
					actionButtons.push(previousButton('admin-users'));
					
					return query.editMessageText(
						`👤 <b>Информация о пользователе</b>\n\n` +
						`ID: <code>${user.id}</code>\n` +
						`Имя пользователя: <b>${user.username || 'Не указано'}</b>\n` +
						`Логин: <b>${user.login || 'Не указан'}</b>\n` +
						`Статус: ${getAdminType(user.id, user.isAdmin)}${user.isBlocked ? ' 🔒 Заблокирован' : ''}\n` +
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
					
					// Кнопка назначения/снятия прав администратора
					if (!user.isAdmin) {
						// Если пользователь не админ, показываем кнопку назначения админом
						actionButtons.push([{
							callback_data: `admin-user-set-admin-${user.id}`,
							text: '👑 Назначить администратором'
						}]);
					} else if (!isMasterAdmin(user.id)) {
						// Если пользователь админ, но не мастер-админ, показываем кнопку снятия прав
						actionButtons.push([{
							callback_data: `admin-user-remove-admin-${user.id}`,
							text: '👤 Снять права администратора'
						}]);
					}
					
					// Кнопка назад к списку пользователей
					actionButtons.push(previousButton('admin-users'));
					
					return query.editMessageText(
						`👤 <b>Информация о пользователе</b>\n\n` +
						`ID: <code>${user.id}</code>\n` +
						`Имя пользователя: <b>${user.username || 'Не указано'}</b>\n` +
						`Логин: <b>${user.login || 'Не указан'}</b>\n` +
						`Статус: ${getAdminType(user.id, user.isAdmin)} 🔒 Заблокирован\n` +
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
					
					// Кнопка назначения/снятия прав администратора
					if (!user.isAdmin) {
						// Если пользователь не админ, показываем кнопку назначения админом
						actionButtons.push([{
							callback_data: `admin-user-set-admin-${user.id}`,
							text: '👑 Назначить администратором'
						}]);
					} else if (!isMasterAdmin(user.id)) {
						// Если пользователь админ, но не мастер-админ, показываем кнопку снятия прав
						actionButtons.push([{
							callback_data: `admin-user-remove-admin-${user.id}`,
							text: '👤 Снять права администратора'
						}]);
					}
					
					// Кнопка назад к списку пользователей
					actionButtons.push(previousButton('admin-users'));
					
					return query.editMessageText(
						`👤 <b>Информация о пользователе</b>\n\n` +
						`ID: <code>${user.id}</code>\n` +
						`Имя пользователя: <b>${user.username || 'Не указано'}</b>\n` +
						`Логин: <b>${user.login || 'Не указан'}</b>\n` +
						`Статус: ${getAdminType(user.id, user.isAdmin)} ${user.isBlocked ? ' 🔒 Заблокирован' : ''}\n` +
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
					console.error('[ADMIN_USER_REMOVE_ADMIN] Error:', error);
					return query.answerCbQuery('❌ Ошибка при снятии прав администратора', { show_alert: true });
				}
			}
			
			// Обработка назначения прав администратора
			if (matchUserSetAdmin) {
				try {
					const userId = matchUserSetAdmin[1];
					
					// Проверяем, является ли пользователь мастер-админом
					if (isMasterAdmin(userId)) {
						// Если это мастер-админ, запрещаем назначать права
						return query.answerCbQuery('⛔ Нельзя назначить права System Admin', { show_alert: true });
					}
					
					// Назначаем права администратора
					await prisma.user.update({
						where: { id: userId },
						data: { isAdmin: true }
					});
					
					// Отправляем уведомление об успешном назначении прав
					await query.answerCbQuery('✅ Права администратора назначены', { show_alert: true });
					
					// Отправляем уведомление пользователю
					await query.telegram.sendMessage(
						userId,
						`👤 <b>Вы теперь являетесь администратором</b>\n\nУважаемый пользователь, администрация ${config.shopName} назначила вам права администратора.\n\nВы получаете доступ к функциям управления системой.\n\nЕсли у вас есть вопросы, обратитесь в службу поддержки.`,
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
					const updatedAt = user.updatedAt ? new Date(user.updatedAt).toLocaleString('ru-RU') : registeredAt;
					
					// Создаем кнопки действий для пользователя
					const actionButtons: InlineKeyboardButton[][] = [];
					
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
					
					// Кнопка назначения/снятия прав администратора
					if (!user.isAdmin) {
						// Если пользователь не админ, показываем кнопку назначения админом
						actionButtons.push([{
							callback_data: `admin-user-set-admin-${user.id}`,
							text: '👑 Назначить администратором'
						}]);
					} else if (!isMasterAdmin(user.id)) {
						// Если пользователь админ, но не мастер-админ, показываем кнопку снятия прав
						actionButtons.push([{
							callback_data: `admin-user-remove-admin-${user.id}`,
							text: '👤 Снять права администратора'
						}]);
					}
					
					// Кнопка назад к списку пользователей
					actionButtons.push(previousButton('admin-users'));
					
					return query.editMessageText(
						`👤 <b>Информация о пользователе</b>\n\n` +
						`ID: <code>${user.id}</code>\n` +
						`Имя пользователя: <b>${user.username || 'Не указано'}</b>\n` +
						`Логин: <b>${user.login || 'Не указан'}</b>\n` +
						`Статус: ${getAdminType(user.id, user.isAdmin)} ${user.isBlocked ? ' 🔒 Заблокирован' : ''}\n` +
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
					console.error('[ADMIN_USER_SET_ADMIN] Error:', error);
					return query.answerCbQuery('❌ Ошибка при назначении прав администратора', { show_alert: true });
				}
			}
			
			// Обработка снятия прав администратора
			if (matchUserRemoveAdmin) {
				try {
					const userId = matchUserRemoveAdmin[1];
					
					// Проверяем, является ли пользователь мастер-админом
					if (isMasterAdmin(userId)) {
						// Если это мастер-админ, запрещаем снимать права
						return query.answerCbQuery('⛔ Нельзя снять права у System Admin', { show_alert: true });
					}
					
					// Снимаем права администратора
					await prisma.user.update({
						where: { id: userId },
						data: { isAdmin: false }
					});
					
					// Отправляем уведомление об успешном снятии прав
					await query.answerCbQuery('✅ Права администратора сняты', { show_alert: true });
					
					// Отправляем уведомление пользователю
					await query.telegram.sendMessage(
						userId,
						`👤 <b>Вы больше не являетесь администратором</b>\n\nУважаемый пользователь, администрация ${config.shopName} отозвала ваши права администратора.\n\nВы больше не имеете доступа к функциям управления системой.\n\nЕсли у вас есть вопросы, обратитесь в службу поддержки.`,
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
					const updatedAt = user.updatedAt ? new Date(user.updatedAt).toLocaleString('ru-RU') : registeredAt;
					
					// Создаем кнопки действий для пользователя
					const actionButtons: InlineKeyboardButton[][] = [];
					
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
					
					// Кнопка назначения/снятия прав администратора
					if (!user.isAdmin) {
						// Если пользователь не админ, показываем кнопку назначения админом
						actionButtons.push([{
							callback_data: `admin-user-set-admin-${user.id}`,
							text: '👑 Назначить администратором'
						}]);
					} else if (!isMasterAdmin(user.id)) {
						// Если пользователь админ, но не мастер-админ, показываем кнопку снятия прав
						actionButtons.push([{
							callback_data: `admin-user-remove-admin-${user.id}`,
							text: '👤 Снять права администратора'
						}]);
					}
					
					// Кнопка назад к списку пользователей
					actionButtons.push(previousButton('admin-users'));
					
					return query.editMessageText(
						`👤 <b>Информация о пользователе</b>\n\n` +
						`ID: <code>${user.id}</code>\n` +
						`Имя пользователя: <b>${user.username || 'Не указано'}</b>\n` +
						`Логин: <b>${user.login || 'Не указан'}</b>\n` +
						`Статус: ${getAdminType(user.id, user.isAdmin)} ${user.isBlocked ? ' 🔒 Заблокирован' : ''}\n` +
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
					console.error('[ADMIN_USER_REMOVE_ADMIN] Error:', error);
					return query.answerCbQuery('❌ Ошибка при снятии прав администратора', { show_alert: true });
				}
			}
		} catch (error) {
			console.log(error)
			return query.reply('❗️ Произошла непредвиденная ошибка')
		}
	})
}
