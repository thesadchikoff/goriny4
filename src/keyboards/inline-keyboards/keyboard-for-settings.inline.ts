import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram'
import { backInlineKeyboard } from './back.inline'

export const inlineKeyboardForSettings = (
	isAdmin: boolean,
	isBtcSubscribed: boolean = false
): InlineKeyboardButton[][] => {
	const buttons = [
		[
			{
				callback_data: 'requisites',
				text: '💳 Реквизиты',
			},
		],
		[
			{
				callback_data: isBtcSubscribed ? 'btc-unsubscribe' : 'btc-subscribe',
				text: isBtcSubscribed ? '🔕 Отписаться от курса BTC' : '🔔 Подписаться на курс BTC',
			},
		],
		backInlineKeyboard('main_menu'),
	]
	if (isAdmin) {
		buttons[0].push({
			callback_data: 'admin-panel',
			text: '🛡️ Администрирование',
		})
	}
	return buttons
}
