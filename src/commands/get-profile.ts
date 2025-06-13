import { Context } from "telegraf";
import { BotContext } from "@/@types/scenes";
import userService from "@/db/user.service";
import currencyService from "@/service/currency.service";
import { currencyFormatter } from "@/utils/currency-formatter";
import { dateFormat } from "@/utils/format-date";
import { Stage } from "@/index";

/**
 * Команда для просмотра подробной информации о профиле пользователя
 */
export const profileCommand = () => {
    Stage.command(['profile', 'me'], async (ctx) => {
        try {
            // Получаем ID пользователя
            const userId = ctx.from?.id.toString();
            if (!userId) {
                return ctx.reply('❌ Не удалось определить ваш ID. Пожалуйста, попробуйте позже.');
            }

            // Отправляем сообщение о загрузке
            const loadingMsg = await ctx.reply('⏳ Загружаем информацию о вашем профиле...');
            
            // Получаем профиль пользователя
            const profile = await userService.fetchOneById({ id: userId });
            
            if (!profile) {
                await ctx.telegram.editMessageText(
                    ctx.chat?.id,
                    loadingMsg.message_id,
                    undefined,
                    '❌ Профиль не найден. Пожалуйста, перезапустите бота с помощью команды /start'
                );
                return;
            }
            
            // Определяем статус кошелька
            const hasWallet = profile.wallet !== null;
            
            // Получаем курс BTC для отображения сумм в валюте
            let btcRate: any = null;
            try {
                const currency = await currencyService.getCurrency('bitcoin');
                btcRate = currency?.bitcoin;
            } catch (error) {
                console.error('Ошибка при получении курса BTC:', error);
            }
            
            // Формируем сообщение с информацией о профиле
            let messageText = `📱 <b>Профиль пользователя</b>\n\n`;
            
            // Основная информация
            messageText += `👤 <b>Основная информация:</b>\n`;
            messageText += `• Имя: <b>${profile.username}</b>\n`;
            messageText += `• Логин: <b>${profile.login || 'Не установлен'}</b>\n`;
            messageText += `• ID: <code>${profile.id}</code>\n`;
            messageText += `• Дата регистрации: <b>${dateFormat(profile.createdAt)}</b>\n`;
            
            // Статусы
            messageText += `\n🚦 <b>Статусы:</b>\n`;
            messageText += `• ${profile.isAdmin ? '✅' : '❌'} Администратор\n`;
            messageText += `• ${profile.isBtcSubscribed ? '✅' : '❌'} Уведомления о курсе BTC\n`;
            messageText += `• ${profile.isBlocked ? '⛔️' : '✅'} Доступ к системе\n`;

            // Информация о кошельке
            messageText += `\n💼 <b>Кошелек:</b>\n`;
            
            if (hasWallet && profile.wallet) {
                const wallet = profile.wallet;
                const frozenBalance = parseFloat(wallet.frozenBalance?.toString() || '0') || 0;
                const availableBalance = parseFloat(wallet.balance?.toString() || '0') - frozenBalance;
                
                messageText += `• Адрес: <code>${wallet.address}</code>\n`;
                messageText += `• Общий баланс: <b>${parseFloat(wallet.balance?.toString() || '0').toFixed(8)} BTC</b>`;
                
                if (btcRate) {
                    const fiatValue = parseFloat(wallet.balance?.toString() || '0') * btcRate.rub;
                    messageText += ` (≈${currencyFormatter(fiatValue, 'rub')})\n`;
                } else {
                    messageText += '\n';
                }
                
                // Информация о замороженных средствах
                messageText += `• Заморожено: <b>${frozenBalance.toFixed(8)} BTC</b>`;
                if (btcRate && frozenBalance > 0) {
                    const frozenFiatValue = frozenBalance * btcRate.rub;
                    messageText += ` (≈${currencyFormatter(frozenFiatValue, 'rub')})\n`;
                } else {
                    messageText += '\n';
                }
                
                // Доступные средства
                messageText += `• Доступно: <b>${availableBalance.toFixed(8)} BTC</b>`;
                if (btcRate) {
                    const availableFiatValue = availableBalance * btcRate.rub;
                    messageText += ` (≈${currencyFormatter(availableFiatValue, 'rub')})\n`;
                } else {
                    messageText += '\n';
                }
                
                if (frozenBalance > 0) {
                    messageText += `\n📝 <i>Замороженные средства зарезервированы для ваших активных объявлений на продажу.</i>\n`;
                }
            } else {
                messageText += `• <i>У вас нет активного кошелька.</i>\n`;
                messageText += `• <i>Используйте /start для создания кошелька.</i>\n`;
            }

            // Добавляем информацию о времени обновления
            messageText += `\n🕒 <i>Информация обновлена: ${dateFormat(new Date())}</i>`;
            
            // Редактируем исходное сообщение
            await ctx.telegram.editMessageText(
                ctx.chat?.id, 
                loadingMsg.message_id, 
                undefined, 
                messageText, 
                { 
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '💰 Кошелек', callback_data: 'wallet' },
                                { text: '⚙️ Настройки', callback_data: 'settings' }
                            ]
                        ]
                    }
                }
            );
        } catch (error) {
            console.error('Ошибка при получении профиля:', error);
            return ctx.reply('❌ Произошла ошибка при получении информации о вашем профиле. Пожалуйста, попробуйте позже.');
        }
    });
}; 