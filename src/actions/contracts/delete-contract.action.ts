import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import frozenBalanceService from '@/service/frozen-balance.service'
import { previousButton } from '@/keyboards/inline-keyboards/previous-button.inline'

export const deleteContractAction = async (ctx: BotContext) => {
    try {
        // Проверяем, что у нас есть match с ID контракта
        if (!ctx.match) {
            return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
        }

        const itemId = Number(ctx.match[1])
        
        // Получаем контракт с дополнительной информацией
        const contractToDelete = await prisma.contract.findFirst({
            where: {
                id: itemId
            },
            include: {
                author: {
                    include: {
                        wallet: true
                    }
                }
            }
        })
        
        if (!contractToDelete) {
            return ctx.answerCbQuery('Контракт не найден', { show_alert: true })
        }
        
        // Получаем информацию о замороженных средствах до удаления
        let frozenInfo = null
        
        // Если контракт типа "sell", нужно разморозить BTC
        if (contractToDelete.type === 'sell') {
            console.log(`[CONTRACT_DELETE] Unfreezing ${contractToDelete.amount} BTC for contract #${contractToDelete.id}`)
            
            // Получаем текущее состояние замороженных средств
            frozenInfo = await frozenBalanceService.checkAvailableBalance(
                contractToDelete.author.id,
                0 // 0, так как нам не нужно проверять доступность для определенной суммы
            )
            
            console.log(`[CONTRACT_DELETE] Before unfreezing - Total: ${frozenInfo.totalBalance}, Frozen: ${frozenInfo.frozenBalance}, Available: ${frozenInfo.availableBalance}`)
            
            // Размораживаем средства с помощью нового метода
            const unfreezeResult = await frozenBalanceService.unfreezeBalance(
                contractToDelete.author.id,
                contractToDelete.id
            )
            
            if (!unfreezeResult) {
                console.error(`[CONTRACT_DELETE] Failed to unfreeze balance for contract #${contractToDelete.id}`)
                return ctx.answerCbQuery('Ошибка при разморозке средств', { show_alert: true })
            }
            
            // Проверяем новое состояние замороженных средств
            const newFrozenInfo = await frozenBalanceService.checkAvailableBalance(
                contractToDelete.author.id,
                0
            )
            
            console.log(`[CONTRACT_DELETE] After unfreezing - Total: ${newFrozenInfo.totalBalance}, Frozen: ${newFrozenInfo.frozenBalance}, Available: ${newFrozenInfo.availableBalance}`)
        }
        
        // Удаляем контракт
        await prisma.contract.delete({
            where: {
                id: itemId
            }
        })
        
        // Отправляем пользователю сообщение об успешном удалении
        await ctx.telegram.sendMessage(
            contractToDelete.author.id,
            `🗑 Ваш контракт #${contractToDelete.id} был успешно удален.${
                contractToDelete.type === 'sell' 
                ? `\n\n💰 ${contractToDelete.amount} BTC были разморожены и возвращены на ваш баланс.` 
                : ''
            }`
        )
        
        return ctx.editMessageText(
            `✅ Контракт #${contractToDelete.id} успешно удален`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [previousButton]
                    ]
                }
            }
        )
    } catch (error) {
        console.error('[DELETE_CONTRACT] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при удалении контракта', { show_alert: true })
    }
} 