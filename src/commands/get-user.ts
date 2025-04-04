import { prisma } from '@/prisma/prisma.client'

import { totalDays } from '@/utils/total-days'
import {SceneContext, WizardContext} from 'telegraf/typings/scenes'
import cuid = require('cuid')
import {Scenes} from "telegraf";
import {sendUserInfo} from "@/utils/send-user-info";
const isValidLogin = (text: string) => {
	// Проверяем, что текст начинается с '/user_' и далее идет набор из 8 букв (заглавных или строчных) или цифр
	const regex = /^\/user_[A-Z0-9a-z]{8}$/;
	return regex.test(text);
};



export const getUserInfo = async (ctx: WizardContext<Scenes.WizardSessionData>) => {
	// @ts-ignore
	const messageText = ctx.message.text
	try {
		if (isValidLogin(messageText)) {
			console.log(2)
			const userCuid = messageText.slice(1)
			await sendUserInfo(userCuid, ctx)
		} else {
			return
		}
	} catch (error) {
		console.log(error)
		return ctx.reply(
			'🚫 Произошла ошибка при получении пользователя, попробуйте еще раз.'
		)
	}
}
