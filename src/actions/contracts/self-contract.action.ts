import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import currencyService from '@/service/currency.service'
import { currencyFormatter } from '@/utils/currency-formatter'
import { previousButton } from '@/keyboards/inline-keyboards/previous-button.inline'

export const selfContractAction = async (ctx: BotContext) => {
    try {
        // Проверяем, что у нас есть match с ID контракта
        if (!ctx.match) {
            return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
        }

        const itemId = Number(ctx.match[1])
        const course = await currencyService.getCurrency('bitcoin')
        
        // Получаем контракт с дополнительными данными
        const contract = await prisma.contract.findFirst({
            where: {
                id: itemId,
            },
            include: {
                paymentMethod: true,
                ContractTransaction: true
            },
        })

        if (!contract) {
            return ctx.answerCbQuery('Контракт не найден', { show_alert: true })
        }

        // Получаем реквизиты контракта
        const contractRequisite = await prisma.contractRequisite.findFirst({
            where: {
                id: Number(contract.contractRequisiteId),
            },
            include: {
                paymentMethod: true
            }
        })

        const buttons = []
        
        // Находим активные транзакции для этого контракта
        const activeTransactions = await prisma.contractTransaction.findMany({
            where: {
                contractId: contract.id,
                isAccepted: false
            }
        })

        // Если есть активная транзакция, добавляем кнопку отмены
        if (activeTransactions.length > 0) {
            buttons.push([
                {
                    callback_data: `cancel-transaction-${activeTransactions[0].id}`,
                    text: '❌ Отменить сделку',
                }
            ])
        }
        
        // Кнопка редактирования описания контракта
        buttons.push([
            {
                callback_data: `edit-contract-description-${contract.id}`,
                text: '📝 Редактировать описание',
            },
        ])
        
        // Кнопка удаления контракта
        buttons.push([
            {
                callback_data: `delete-contract-${contract.id}`,
                text: '🗑 Удалить контракт',
            },
        ])
        
        // Кнопка возврата
        buttons.push(previousButton('my_ads'))
        
        return ctx.editMessageText(
            `📰 Заявка <a>#${contract.id}</a>\n\n` +
            `<b>Метод оплаты:</b> ${contractRequisite?.paymentMethod.name} | ${contractRequisite?.paymentData}\n` +
            `<b>Курс 1 BTC: </b>${currencyFormatter(course?.bitcoin.rub!, 'rub')}\n` +
            `<b>Минимальная сумма:</b> ${contract.price} ${contract.currency}\n` +
            `<b>Максимальная сумма:</b> ${contract.maxPrice} ${contract.currency}` +
            (contract.comment ? `\n\n<b>Описание:</b>\n${contract.comment}` : ''),
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons
                },
            }
        )
    } catch (error) {
        console.error('[SELF_CONTRACT] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
    }
} 