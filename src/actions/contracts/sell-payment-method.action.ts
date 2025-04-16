import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import { previousButton } from '@/keyboards/inline-keyboards/previous-button.inline'
import { currencyFormatter } from '@/utils/currency-formatter'
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram'
import { QueryTriggers } from '@/constants/query-triggers'

export const sellPaymentMethodAction = async (ctx: BotContext) => {
    try {
        // Проверяем, что у нас есть match с ID метода оплаты
        if (!ctx.match) {
            return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
        }

        const itemId = Number(ctx.match[1])
        
        // Получаем метод оплаты
        const paymentMethod = await prisma.paymentMethod.findFirst({
            where: {
                id: itemId,
            },
        })
        
        if (!paymentMethod) {
            return ctx.answerCbQuery('Метод оплаты не найден', { show_alert: true })
        }
        
        // Получаем контракты для данного метода оплаты
        const contracts = await prisma.contract.findMany({
            where: {
                paymentMethodId: paymentMethod.id,
                type: 'sell',
            },
            include: {
                author: true,
            },
        })
        
        // Формируем кнопки для каждого контракта
        const contractsButtons: InlineKeyboardButton[][] = contracts.map(
            contract => {
                return [
                    {
                        callback_data: QueryTriggers.SELL_CONTRACT(contract.id),
                        text: `${contract.author.username} | ${currencyFormatter(
                            contract.amount,
                            contract.currency!
                        )} | ${currencyFormatter(
                            contract.price,
                            contract.currency!
                        )} - ${currencyFormatter(
                            contract.maxPrice!,
                            contract.currency!
                        )}`,
                    },
                ]
            }
        )
        
        return ctx.editMessageText(
            `💳 Здесь вы можете купить BTC за RUB через ${paymentMethod.name}.`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [...contractsButtons, previousButton('sell')],
                },
            }
        )
    } catch (error) {
        console.error('[SELL_PAYMENT_METHOD] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
    }
} 