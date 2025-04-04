import {prisma} from '@/prisma/prisma.client'
import {totalDays} from '@/utils/total-days'
import {Scenes} from 'telegraf'
import {SceneContext, WizardContext} from 'telegraf/typings/scenes'
import {generateUrlForUser} from './generate-user-url'

export const sendUserInfo = async (
	userName: string,
	ctx: WizardContext<Scenes.WizardSessionData> | SceneContext
) => {
	const user = await prisma.user.findFirst({
		where: {
			login: userName,
		},
	})

	if (!user) {
		return ctx.reply(
			'🚫 Произошла ошибка при получении пользователя, попробуйте еще раз.'
		)
	}
	let totalTransferAmount: number = 0

	const diffInDays = totalDays(user.createdAt)
	const userUrl = generateUrlForUser(user.login!)
	return ctx.reply(
		`👤 | Информация о пользователе <a href="${userUrl}">${user.login}</a>\n\n<b>Логин:</b> ${user.login}\n<b>BTC Рейтинг: </b> 🔸 (0)\n<b>Дней в сервисе:</b> ${diffInDays}`,
		{
			parse_mode: 'HTML',
		}
	)
}
