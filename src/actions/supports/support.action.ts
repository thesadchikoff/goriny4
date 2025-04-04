import { BotContext } from '@/@types/scenes'

export const supportAction = (ctx: BotContext) => {
	return ctx.scene.enter('support')
}
