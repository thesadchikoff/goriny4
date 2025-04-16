import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import userService from '@/db/user.service'
import { WizardScene } from 'telegraf/typings/scenes'

export const buyContractAction = async (ctx: BotContext) => {
    try {
        // Проверяем, что у нас есть match с ID контракта
        if (!ctx.match) {
            return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
        }

        const itemId = Number(ctx.match[1])
        
        // Найдем контракт
        const contract = await prisma.contract.findFirst({
            where: {
                id: itemId,
            },
            include: {
                author: true
            }
        });
        
        // Проверка, что пользователь не пытается купить у самого себя
        if (contract?.author.id === ctx.from?.id.toString()) {
            return ctx.answerCbQuery('❌ Вы не можете торговать с самим собой', {
                show_alert: true
            });
        }
        
        // Сохраняем ID контракта в сцене
        ctx.scene.state = {
            ...ctx.scene.state,
            contractId: itemId
        }
        
        // Получаем информацию о пользователе и его балансе
        const user = await userService.fetchOneById({
            id: ctx.from!.id
        })
        
        // Переходим к сцене покупки контракта
        return ctx.scene.enter('buy-contract')
    } catch (error) {
        console.error('[BUY_CONTRACT] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
    }
} 