import {BotContext} from "@/@types/scenes";
import {prisma} from "@/prisma/prisma.client";
import {previousButton} from "@/keyboards/inline-keyboards/previous-button.inline";
import {QueryTriggers} from "@/constants/query-triggers";
import {generateUrlForUser} from "@/utils/generate-user-url";
import currencyService from "@/service/currency.service";
import {currencyFormatter} from "@/utils/currency-formatter";

export const activeContractDetailAction = async (ctx: BotContext) => {
    try {
        if (!ctx.match) {
            return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
        }

        const contractId = ctx.match[1]
        console.log('[ACTIVE_CONTRACT_DETAIL] Contract ID:', contractId)
        
        const contractTransaction = await prisma.contractTransaction.findFirst({
            where: {
                id: contractId
            },
            include: {
                buyer: true,
                seller: true,
                contract: {
                    include: {
                        ContractRequisite: {
                            include: {
                                paymentMethod: true
                            }
                        }
                    }
                }
            }
        })

        console.log('[ACTIVE_CONTRACT_DETAIL] Found transaction:', contractTransaction)

        if (!contractTransaction) {
            return ctx.answerCbQuery('Сделка не найдена', { show_alert: true })
        }

        const amountToBtc = await currencyService.convertRubleToBTC(
            contractTransaction.amount,
            contractTransaction.contract.currency!,
            false
        );

        const sellerUrl = generateUrlForUser(contractTransaction.seller!.login!)
        const buyerUrl = generateUrlForUser(contractTransaction.buyer!.login!)
        
        const isBuyer = ctx.from!.id.toString() === contractTransaction.buyerId
        const isSeller = ctx.from!.id.toString() === contractTransaction.sellerId

        if (!isBuyer && !isSeller) {
            return ctx.answerCbQuery('У вас нет прав для просмотра этой сделки', { show_alert: true })
        }

        const buttons = []

        // Кнопки для покупателя
        if (isBuyer) {
            buttons.push([
                {
                    callback_data: `send-message-${contractTransaction.sellerId}`,
                    text: '💬 Написать продавцу'
                },
                {
                    callback_data: `payment-contract-${contractTransaction.id}`,
                    text: '✅ Я оплатил'
                }
            ])
        }
        // Кнопки для продавца
        else if (isSeller) {
            buttons.push([
                {
                    callback_data: `send-message-${contractTransaction.buyerId}`,
                    text: '💬 Написать покупателю'
                },
                {
                    callback_data: `payment-successful-${contractTransaction.id}`,
                    text: '✅ Деньги получены'
                }
            ])
        }

        // Добавляем кнопку отмены сделки
        buttons.push([
            {
                callback_data: `cancel-transaction-${contractTransaction.id}`,
                text: '❌ Отменить сделку'
            }
        ])

        // Добавляем кнопку возврата
        buttons.push(previousButton(QueryTriggers.ACTIVE_CONTRACTS()))

        return ctx.editMessageText(
            `<b>Контракт #${contractTransaction.code}</b>\n\n` +
            `<b>Покупает: </b><a href="${buyerUrl}">${contractTransaction.buyer!.login}</a>\n` +
            `<b>Продает: </b><a href="${sellerUrl}">${contractTransaction.seller!.login}</a>\n` +
            `<b>Сумма:</b> ${amountToBtc.toFixed(6)} BTC (${currencyFormatter(contractTransaction.amount, contractTransaction.contract.currency!)})\n\n` +
            `<b>Статус:</b> Ожидает оплаты\n\n` +
            `<b>Способ оплаты:</b> ${contractTransaction.contract.ContractRequisite?.paymentMethod.name || 'Не указан'}\n` +
            `<b>Реквизиты:</b> ${contractTransaction.contract.ContractRequisite?.paymentData || 'Не указаны'}`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons
                }
            }
        )
    } catch (error) {
        console.error('[ACTIVE_CONTRACT_DETAIL] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при получении деталей сделки', { show_alert: true })
    }
}