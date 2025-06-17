import { BotContext } from "@/@types/scenes";
import { prisma } from "@/prisma/prisma.client";
import { currencyFormatter } from "@/utils/currency-formatter";

/**
 * Действие для отмены транзакции
 * @param ctx Контекст бота
 * @returns Результат выполнения действия
 */
export const cancelTransactionAction = async (ctx: any) => {
    try {
        // Проверяем весь объект match для отладки
        console.log('[CANCEL_TRANSACTION] Match object:', ctx.match);
        
        // Получаем ID транзакции из callback_data
        const transactionId = ctx.match?.[1];
        
        console.log('[CANCEL_TRANSACTION] Received transaction ID:', transactionId);
        
        // Проверяем callback_query напрямую
        const callbackQuery = ctx.callbackQuery;
        console.log('[CANCEL_TRANSACTION] Original callback object:', callbackQuery ? 'exists' : 'missing');
        
        if (!transactionId) {
            console.error('[CANCEL_TRANSACTION] Transaction ID not found in match data');
            return ctx.answerCbQuery('Ошибка: ID транзакции не найден', { show_alert: true });
        }
        
        // Проверяем формат UUID
        console.log('[CANCEL_TRANSACTION] Transaction ID format check:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId) ? 'Valid UUID' : 'Not UUID format');
        
        // Получаем список всех транзакций для отладки
        const allTransactions = await prisma.contractTransaction.findMany({
            take: 10
        });
        console.log('[CANCEL_TRANSACTION] All transactions (first 10):', 
            allTransactions.map(t => ({ id: t.id, buyerId: t.buyerId, sellerId: t.sellerId }))
        );
        
        // Находим транзакцию по id без проверки isAccepted
        console.log('[CANCEL_TRANSACTION] Searching for transaction with ID:', transactionId);
        const transaction = await prisma.contractTransaction.findFirst({
            where: {
                id: transactionId // ID имеет формат UUID, используем строку как есть
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
        });
        
        console.log('[CANCEL_TRANSACTION] Transaction found:', transaction ? 'Yes' : 'No');
        
        if (!transaction) {
            console.error('[CANCEL_TRANSACTION] Transaction not found in database');
            return ctx.answerCbQuery('Транзакция не найдена', { show_alert: true });
        }
        
        // Проверяем, что пользователь является участником транзакции
        const userId = ctx.from?.id.toString();
        console.log('[CANCEL_TRANSACTION] User ID:', userId);
        console.log('[CANCEL_TRANSACTION] Buyer ID:', transaction.buyerId);
        console.log('[CANCEL_TRANSACTION] Seller ID:', transaction.sellerId);
        
        if (userId !== transaction.buyerId && userId !== transaction.sellerId) {
            console.error('[CANCEL_TRANSACTION] User is not a transaction participant');
            return ctx.answerCbQuery('Вы не являетесь участником этой сделки', { show_alert: true });
        }
        
        // Удаляем транзакцию напрямую
        console.log('[CANCEL_TRANSACTION] Deleting transaction with ID:', transaction.id);
        try {
            await prisma.contractTransaction.delete({
                where: {
                    id: transaction.id
                }
            });
            console.log('[CANCEL_TRANSACTION] Transaction deleted successfully');
        } catch (deleteError) {
            console.error('[CANCEL_TRANSACTION] Error deleting transaction:', deleteError);
            return ctx.answerCbQuery('Ошибка при удалении транзакции', { show_alert: true });
        }
        
        // Определяем, кто отменяет сделку
        const isBuyerCancelling = userId === transaction.buyerId;
        const cancellerRole = isBuyerCancelling ? 'покупатель' : 'продавец';
        const otherPartyRole = isBuyerCancelling ? 'продавец' : 'покупатель';
        const otherPartyId = isBuyerCancelling ? transaction.sellerId : transaction.buyerId;
        const otherPartyLogin = isBuyerCancelling ? transaction.seller?.login : transaction.buyer?.login;
        
        // Оповещаем другую сторону сделки
        if (otherPartyId) {
            console.log(`[CANCEL_TRANSACTION] Notifying ${otherPartyRole}:`, otherPartyId);
            await ctx.telegram.sendMessage(
                otherPartyId,
                `❌ <b>Сделка отменена</b>\n\n${cancellerRole} отменил сделку #${transaction.contract.code}\nСумма: ${currencyFormatter(transaction.amount, transaction.contract.currency || 'RUB')}`,
                { parse_mode: 'HTML' }
            );
        }
        
        // Оповещаем отменяющего и обновляем сообщение
        console.log('[CANCEL_TRANSACTION] Updating message for canceller');
        return ctx.editMessageText(
            `❌ <b>Сделка отменена</b>\n\nВы отменили сделку #${transaction.contract.code}\nСумма: ${currencyFormatter(transaction.amount, transaction.contract.currency || 'RUB')}\n\n${otherPartyRole}: ${otherPartyLogin}\nСпособ оплаты: ${transaction.contract.ContractRequisite?.paymentMethod.name || 'Не указан'}`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                callback_data: 'main_menu',
                                text: '📋 В главное меню'
                            }
                        ]
                    ]
                }
            }
        );
    } catch (error) {
        console.error('[CANCEL_TRANSACTION] Error:', error);
        return ctx.answerCbQuery('Произошла ошибка при отмене сделки', { show_alert: true });
    }
}; 