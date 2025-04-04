import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram'
import { backInlineKeyboard } from './back.inline'

export const supportsInlineKeyboards: InlineKeyboardButton[][] = [
	[
		{
			callback_data: 'support-tickets',
			text: '🎫 Тикеты',
		},
	],
	backInlineKeyboard('admin-panel'),
]
