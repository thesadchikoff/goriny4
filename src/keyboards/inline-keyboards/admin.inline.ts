import {InlineKeyboardButton} from 'telegraf/typings/core/types/typegram'

export const adminInlineKeyboards: InlineKeyboardButton[][] = [
	[
		{
			callback_data: 'change_fee',
			text: '💸 Изменить комиссию',
		},
		{
			callback_data: 'support-panel',
			text: '⚙️ Саппорт панель',
		},
	],
	[
		{
			callback_data: 'admin-address-change',
			text: '💳 Root кошелек',
		},
		{
			callback_data: 'admin-users',
			text: '👥 Пользователи',
		},
	],
]
