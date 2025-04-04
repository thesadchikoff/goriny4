import { BotContext } from '@/@types/scenes'
import { supportsInlineKeyboards } from '@/keyboards/inline-keyboards/supports.inline'

export const supportPanelAction = (ctx: BotContext) => {
	return ctx.editMessageText('Выберите желаемый пункт:', {
		reply_markup: {
			inline_keyboard: supportsInlineKeyboards,
		},
	})
}
