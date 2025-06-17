import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import { currencyFormatter } from '@/utils/currency-formatter'

export const paymentConfirmationAction = async (ctx: BotContext) => {
    try {
        if (!ctx.match) {
            return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
        }

        const transactionId = ctx.match[1]
        console.log('[PAYMENT_CONFIRMATION] Transaction ID:', transactionId)
        
        // Получаем транзакцию с связанными данными
        const transaction = await prisma.contractTransaction.findFirst({
            where: {
                id: transactionId
            },
            include: {
                buyer: true,
                seller: true,
                contract: {
                    include: {
                        ContractRequisite: true
                    }
                }
            }
        })

        console.log('[PAYMENT_CONFIRMATION] Found transaction:', transaction)

        if (!transaction) {
            return ctx.answerCbQuery('Транзакция не найдена', { show_alert: true })
        }

        // Проверяем, является ли пользователь покупателем
        const isBuyer = ctx.from?.id.toString() === transaction.buyerId
        const isSeller = ctx.from?.id.toString() === transaction.sellerId

        if (!isBuyer && !isSeller) {
            return ctx.answerCbQuery('У вас нет прав для выполнения этого действия', { show_alert: true })
        }

        // Обработка нажатия кнопки "Я оплатил" покупателем
        if (isBuyer) {
            // Обновляем сообщение у покупателя
            await ctx.editMessageText(
                `✅ Вы подтвердили оплату\n\n` +
                `📊 Детали сделки:\n` +
                `• Номер: #${transaction.code}\n` +
                `• Сумма: ${currencyFormatter(transaction.amount, transaction.contract.currency!)}\n` +
                `• BTC: ${transaction.purchaseAmount.toFixed(8)} BTC\n\n` +
                `⏳ Ожидайте подтверждения от продавца`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    callback_data: `cancel-transaction-${transaction.id}`,
                                    text: '❌ Отменить сделку'
                                }
                            ]
                        ]
                    }
                }
            )

            // Отправляем уведомление продавцу
            await ctx.telegram.sendMessage(
                transaction.sellerId!,
                `🔔 Покупатель подтвердил оплату!\n\n` +
                `📊 Детали сделки:\n` +
                `• Номер: #${transaction.code}\n` +
                `• Сумма: ${currencyFormatter(transaction.amount, transaction.contract.currency!)}\n` +
                `• BTC: ${transaction.purchaseAmount.toFixed(8)} BTC\n\n` +
                `Пожалуйста, проверьте поступление средств и нажмите кнопку "Деньги получены"`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    callback_data: `payment-successful-${transaction.id}`,
                                    text: '✅ Деньги получены'
                                }
                            ],
                            [
                                {
                                    callback_data: `cancel-transaction-${transaction.id}`,
                                    text: '❌ Отменить сделку'
                                }
                            ]
                        ]
                    }
                }
            )
        }
        // Обработка нажатия кнопки "Деньги получены" продавцом
        else if (isSeller) {
            // Проверяем наличие всех необходимых данных
            if (!transaction.buyerId || !transaction.sellerId) {
                return ctx.answerCbQuery('Ошибка: неверные данные транзакции', { show_alert: true })
            }

            // Получаем кошельки покупателя и продавца
            const buyerWallet = await prisma.wallet.findFirst({
                where: {
                    user: {
                        id: transaction.buyerId
                    }
                }
            })

            const sellerWallet = await prisma.wallet.findFirst({
                where: {
                    user: {
                        id: transaction.sellerId
                    }
                }
            })

            if (!buyerWallet || !sellerWallet) {
                return ctx.answerCbQuery('Ошибка: кошельки не найдены', { show_alert: true })
            }

            // Проверяем достаточность средств у продавца
            if (sellerWallet.balance < transaction.purchaseAmount) {
                return ctx.answerCbQuery('Недостаточно средств на балансе продавца', { show_alert: true })
            }

            // Начинаем транзакцию для обновления балансов
            await prisma.$transaction(async (prisma) => {
                // Увеличиваем баланс покупателя
                await prisma.wallet.update({
                    where: { id: buyerWallet.id },
                    data: {
                        balance: {
                            increment: transaction.purchaseAmount
                        }
                    }
                })

                // Уменьшаем баланс продавца
                await prisma.wallet.update({
                    where: { id: sellerWallet.id },
                    data: {
                        balance: {
                            decrement: transaction.purchaseAmount
                        }
                    }
                })
            })

            // Отправляем уведомление покупателю
            await ctx.telegram.sendMessage(
                transaction.buyerId!,
                `✅ Сделка успешно завершена!\n\n` +
                `📊 Детали сделки:\n` +
                `• Номер: #${transaction.code}\n` +
                `• Сумма: ${currencyFormatter(transaction.amount, transaction.contract.currency!)}\n` +
                `• BTC: ${transaction.purchaseAmount.toFixed(8)} BTC\n\n` +
                `💰 На ваш баланс начислено ${transaction.purchaseAmount.toFixed(8)} BTC`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    callback_data: 'main_menu',
                                    text: 'В главное меню'
                                }
                            ]
                        ]
                    }
                }
            )

            // Обновляем сообщение у продавца
            await ctx.editMessageText(
                `✅ Сделка успешно завершена!\n\n` +
                `📊 Детали сделки:\n` +
                `• Номер: #${transaction.code}\n` +
                `• Сумма: ${currencyFormatter(transaction.amount, transaction.contract.currency!)}\n` +
                `• BTC: ${transaction.purchaseAmount.toFixed(8)} BTC\n\n` +
                `💰 С вашего баланса списано ${transaction.purchaseAmount.toFixed(8)} BTC`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    callback_data: 'main_menu',
                                    text: 'В главное меню'
                                }
                            ]
                        ]
                    }
                }
            )

            // Удаляем транзакцию после успешного завершения
            await prisma.contractTransaction.delete({
                where: {
                    id: transaction.id
                }
            });

            // Удаляем контракт после удаления транзакции
            await prisma.contract.delete({
                where: {
                    id: transaction.contractId
                }
            });
        }

        return ctx.answerCbQuery()
    } catch (error) {
        console.error('[PAYMENT_CONFIRMATION] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
    }
} 