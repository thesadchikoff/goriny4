import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import { Scenes } from 'telegraf'

export const editContractDescriptionAction = async (ctx: BotContext) => {
    try {
        // Проверяем, что у нас есть match с ID контракта
        if (!ctx.match) {
            return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
        }

        const contractId = Number(ctx.match[1])
        
        // Проверяем, что контракт существует и принадлежит пользователю
        const contract = await prisma.contract.findFirst({
            where: {
                id: contractId,
                author: {
                    id: ctx.from?.id.toString()
                }
            }
        })
        
        if (!contract) {
            return ctx.answerCbQuery('Контракт не найден или у вас нет прав на его редактирование', { show_alert: true })
        }
        
        // Сохраняем ID контракта в сессии
        ctx.session.contractId = contractId
        
        // Переходим к сцене редактирования описания
        return ctx.scene.enter('edit-contract-description')
    } catch (error) {
        console.error('[EDIT_CONTRACT_DESCRIPTION] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
    }
} 