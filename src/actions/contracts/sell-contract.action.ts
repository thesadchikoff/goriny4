import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import { dateFormat } from '@/utils/format-date'
import { previousButton } from '@/keyboards/inline-keyboards/previous-button.inline'
import { currencyFormatter } from '@/utils/currency-formatter'

export const sellContractAction = async (ctx: BotContext) => {
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
        
        // Проверка, что пользователь не пытается продать самому себе
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
        
        // Получаем детальную информацию о контракте
        const contractDetails = await prisma.contract
            .findFirst({
                where: {
                    id: itemId,
                },
                include: {
                    author: {
                        include: {
                            SellerContractTransaction: true,
                        },
                    },
                    paymentMethod: true,
                },
            });
        
        if (!contractDetails) {
            return ctx.answerCbQuery('Контракт не найден', { show_alert: true })
        }
        
        const buttonText = contractDetails.type === 'buy' ? 'Продать' : 'Купить'
        
        // Подсчитываем статистику трейдера
        const totalTransactions = contractDetails.author.SellerContractTransaction.length;
        // Считаем успешные транзакции как те, у которых нет связанного спора
        const successfulTransactions = contractDetails.author.SellerContractTransaction.filter(t => !t.disputeId).length;
        const reputation = totalTransactions > 0 ? Math.round((successfulTransactions / totalTransactions) * 100) : 100;
        
        // Формируем красивое сообщение
        return ctx.editMessageText(
            `🔍 <b>Детали контракта</b>\n\n` +
            `📋 <b>ID контракта:</b> #${contractDetails.code}\n` +
            `💰 <b>Цена за 1 BTC:</b> ${currencyFormatter(
                contractDetails.amount,
                contractDetails.currency!
            )}\n` +
            `⏱ <b>Время на оплату:</b> 15 минут\n\n` +
            `👤 <b>Информация о трейдере:</b>\n` +
            `• Имя: /${contractDetails.author.login}\n` +
            `• Репутация: ${reputation}% ${reputation >= 90 ? '⭐️' : reputation >= 70 ? '✅' : '⚠️'}\n` +
            `• Отзывы: 😊(${successfulTransactions}) 🙁(${totalTransactions - successfulTransactions})\n` +
            `• Зарегистрирован: ${dateFormat(contractDetails.author.createdAt)}\n\n` +
            `📊 <b>Условия сделки:</b>\n` +
            `• Минимальная сумма: ${currencyFormatter(
                contractDetails.price,
                contractDetails.currency!
            )}\n` +
            `• Максимальная сумма: ${currencyFormatter(
                contractDetails.maxPrice!,
                contractDetails.currency!
            )}\n` +
            (contractDetails.paymentMethod ? `• Способ оплаты: ${contractDetails.paymentMethod.name}\n` : '') +
            (contractDetails.comment ? `\n📝 <b>Описание:</b>\n${contractDetails.comment}` : ''),
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                callback_data: `buy_contract`,
                                text: `✅ ${buttonText}`,
                            },
                        ],
                        previousButton('sell'),
                    ],
                },
            }
        )
    } catch (error) {
        console.error('[SELL_CONTRACT] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
    }
} 