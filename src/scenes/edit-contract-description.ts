import { Scenes } from 'telegraf'
import { WizardContext } from 'telegraf/typings/scenes'
import { prisma } from '@/prisma/prisma.client'
import { previousButton } from '@/keyboards/inline-keyboards/previous-button.inline'
import { selfContractAction } from '@/actions/contracts/self-contract.action'
import { BotContext } from '@/@types/scenes'

// Функция для сохранения описания контракта
const saveContractDescription = async (ctx: WizardContext) => {
    try {
        console.log('Сохранение описания контракта, сессия:', ctx.session)
        
        // Получаем ID контракта из сессии
        const contractId = (ctx.session as any).contractId
        
        if (!contractId) {
            console.error('ID контракта не найден в сессии')
            await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте снова.')
            return ctx.scene.leave()
        }
        
        // Получаем новое описание из сообщения
        const newDescription = ctx.message && 'text' in ctx.message ? ctx.message.text : null
        
        if (!newDescription) {
            await ctx.reply('Пожалуйста, введите текстовое описание.')
            return ctx.wizard.back()
        }
        
        console.log('Обновление описания контракта:', contractId, newDescription)
        
        // Обновляем описание контракта в базе данных
        await prisma.contract.update({
            where: {
                id: contractId
            },
            data: {
                comment: newDescription
            }
        })
        
        // Отправляем сообщение об успешном обновлении
        await ctx.reply('✅ Описание контракта успешно обновлено!')
        
        // Возвращаемся к просмотру контракта
        const botCtx = ctx as unknown as BotContext
        // @ts-ignore
        botCtx.match = ['', contractId.toString()]
        
        return selfContractAction(botCtx)
    } catch (error) {
        console.error('[SAVE_CONTRACT_DESCRIPTION] Error:', error)
        await ctx.reply('Произошла ошибка при сохранении описания. Пожалуйста, попробуйте снова.')
        return ctx.scene.leave()
    }
}

// Создаем сцену редактирования описания контракта
export const EditContractDescription = new Scenes.WizardScene<WizardContext>(
    'edit-contract-description',
    async (ctx) => {
        console.log('Начало сцены редактирования описания контракта')
        await ctx.reply('📝 Введите новое описание для контракта:')
        return ctx.wizard.next()
    },
    saveContractDescription
)

// Добавляем обработчик для текстовых сообщений
EditContractDescription.on('text', async (ctx) => {
    console.log('Получено текстовое сообщение в сцене редактирования описания:', ctx.message.text)

     // Получаем ID контракта из сессии
        const contractId = (ctx.session as any).contractId

        if (!contractId) return ctx.reply('Произошла ошибка. Пожалуйста, попробуйте снова.')
    
    await prisma.contract.update({
            where: {
                id: contractId
            },
            data: {
                comment: ctx.message.text
            }
        })
        
        // Отправляем сообщение об успешном обновлении
        await ctx.reply('✅ Описание контракта успешно обновлено!')
        

    return ctx.wizard.next()
}) 