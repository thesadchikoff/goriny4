import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram'

export const backInlineKeyboard = (route: string): InlineKeyboardButton[] => [
	{
		callback_data: route,
		text: '← Назад',
	},
]
