import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram'
import { backInlineKeyboard } from './back.inline'

export const inlineKeyboardForSettings = (
	isAdmin: boolean
): InlineKeyboardButton[][] => {
	const buttons = [
		[
			{
				callback_data: 'requisites',
				text: '💳 Реквизиты',
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
