import {Context, Telegraf} from 'telegraf'
import {bot} from '@/config/bot'
import {prisma} from '@/prisma/prisma.client'
import {getWalletBalance} from '@/trust-wallet/get-balance'
import {currencyFormatter} from '@/utils/currency-formatter'
import {inlineKeyboardForWallets} from '@/keyboards/inline-keyboards/wallet.inline'
import currencyService from '@/service/currency.service'
import frozenBalanceService from '@/service/frozen-balance.service';
import {dateFormat} from '@/utils/format-date' 

/**
 * Команда для просмотра информации о кошельке пользователя
 */
export const walletInfo = () => {
    bot.command(['wallet', 'balance'], async (ctx) => {
        try {
            const user = await prisma.user.findFirst({
                where: {
                    id: ctx.from.id.toString()
                },
                include: {
                    wallet: true
                }
            });

            if (!user || !user.wallet) {
                return ctx.reply('У вас нет активного кошелька. Пожалуйста, создайте кошелек');
            }

            // Получаем информацию о замороженных средствах
            const frozenInfo = await frozenBalanceService.checkAvailableBalance(
                user.id,
                0 // 0, так как просто запрашиваем информацию
            );

            // Получаем текущий курс BTC
            const currency = await currencyService.getCurrency('bitcoin');

            // Формируем основное сообщение
            let message = `💼 <b>Информация о кошельке</b>\n\n`;
            
            // Добавляем общую информацию
            message += `🔑 <b>Адрес:</b> <code>${user.wallet.address}</code>\n\n`;
            message += `📊 <b>Состояние баланса:</b>\n`;
            message += `• Общий баланс: ${frozenInfo.totalBalance.toFixed(8)} BTC`;
            
            // Конвертация в рубли или другую валюту, если доступна
            if (currency?.bitcoin?.rub) {
                const btcValueInRub = frozenInfo.totalBalance * currency.bitcoin.rub;
                message += ` (≈${currencyFormatter(btcValueInRub, 'rub')})\n`;
            } else {
                message += '\n';
            }
            
            // Информация о заморозке
            message += `• Заморожено: ${frozenInfo.frozenBalance.toFixed(8)} BTC`;
            if (currency?.bitcoin?.rub && frozenInfo.frozenBalance > 0) {
                const frozenValueInRub = frozenInfo.frozenBalance * currency.bitcoin.rub;
                message += ` (≈${currencyFormatter(frozenValueInRub, 'rub')})\n`;
            } else {
                message += '\n';
            }
            
            // Доступные средства
            message += `• Доступно: ${frozenInfo.availableBalance.toFixed(8)} BTC`;
            if (currency?.bitcoin?.rub) {
                const availableValueInRub = frozenInfo.availableBalance * currency.bitcoin.rub;
                message += ` (≈${currencyFormatter(availableValueInRub, 'rub')})\n`;
            } else {
                message += '\n';
            }
            
            // Если есть замороженные средства, объясняем
            if (frozenInfo.frozenBalance > 0) {
                message += `\n📝 <b>Примечание:</b> Замороженные средства зарезервированы для ваших активных объявлений на продажу BTC. После удаления объявлений средства будут разблокированы.`;
            }
            
            // Информация о времени последнего обновления
            message += `\n\n🕒 Данные обновлены: ${dateFormat(new Date())}`;
            
            return ctx.reply(message, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: inlineKeyboardForWallets
                }
            });
        } catch (error) {
            console.error('[WALLET] Error fetching wallet info:', error);
            return ctx.reply('❌ Произошла ошибка при получении информации о кошельке. Пожалуйста, попробуйте позже.');
        }
    });
}; 