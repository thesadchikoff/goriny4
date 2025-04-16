import {BotContext} from "@/@types/scenes";
import {prisma} from "@/prisma/prisma.client";
import {createTransaction, sendTransaction} from "@/trust-wallet/1";
import userService from "@/db/user.service";
import { currencyFormatter } from "@/utils/currency-formatter";
import currencyService from "@/service/currency.service";

export const transferAction = async (ctx: BotContext) => {
   try {
       console.log("transferAction", (ctx.session as any).transfer);
       
       // Проверяем, что данные перевода существуют
       if (!(ctx.session as any).transfer || !(ctx.session as any).transfer.recipientAddress || !(ctx.session as any).countBTC) {
           console.error("Данные перевода отсутствуют:", {
               transfer: (ctx.session as any).transfer,
               countBTC: (ctx.session as any).countBTC
           });
           return ctx.reply("❌ Ошибка: данные перевода отсутствуют. Пожалуйста, начните процесс перевода заново.");
       }
       
       // Получаем пользователя
       const user = await userService.fetchOneById({
           id: ctx.from!.id
       });
       
       if (!user || !user.wallet) {
           return ctx.reply("❌ Ошибка: кошелек не найден");
       }
       
       // Получаем сумму перевода в BTC
       const btcCount = (ctx.session as any).countBTC;
       
       if (!btcCount || btcCount <= 0) {
           return ctx.reply("❌ Ошибка: неверная сумма перевода");
       }
       
       // Получаем адрес получателя
       const recipientAddress = (ctx.session as any).transfer?.recipientAddress;
       
       if (!recipientAddress) {
           return ctx.reply("❌ Ошибка: адрес получателя не указан");
       }
       
       // Получаем конфигурацию для расчета комиссии
       const globalConfig = await prisma.config.findFirst();
       
       if (!globalConfig) {
           return ctx.reply("❌ Ошибка: не удалось получить конфигурацию сервиса");
       }
       
       // Рассчитываем комиссию сервиса
       const feePercentage = globalConfig.feeForTransaction || 0;
       const feeAmount = btcCount * (feePercentage / 100);
       
       // Рассчитываем сумму, которая дойдет до получателя
       const recipientAmount = btcCount - feeAmount;
       
       // Проверяем, достаточно ли средств на балансе
       if (user.wallet.balance < btcCount) {
           return ctx.reply(`❌ Недостаточно средств на балансе. Требуется: ${btcCount.toFixed(8)} BTC, доступно: ${user.wallet.balance.toFixed(8)} BTC`);
       }
       
       // Отправляем сообщение о начале перевода
       await ctx.reply(`🔄 Начинаю перевод ${btcCount.toFixed(8)} BTC\n\nКомиссия сервиса (${feePercentage}%): ${feeAmount.toFixed(8)} BTC\nПолучатель получит: ${recipientAmount.toFixed(8)} BTC`);
       
       // Создаем и отправляем транзакцию получателю
       try {
           console.log(`Создание транзакции для перевода ${recipientAmount.toFixed(8)} BTC на адрес ${recipientAddress}`);
           const txHash = await createTransaction(
               user.wallet.wif, 
               recipientAmount, 
               recipientAddress, 
               globalConfig.feeForTransaction || 0
           );
           
           if (!txHash) {
               return ctx.reply("❌ Ошибка: не удалось создать транзакцию. Возможно, недостаточно средств или проблема с UTXO.");
           }
           
           console.log(`Транзакция создана, отправка: ${txHash}`);
           await sendTransaction(txHash);
           
           // Если есть комиссия, отправляем ее на адрес администратора
           if (feeAmount > 0 && globalConfig.adminWalletAddress) {
               console.log(`Создание транзакции для комиссии ${feeAmount.toFixed(8)} BTC на адрес администратора ${globalConfig.adminWalletAddress}`);
               const adminTxHash = await createTransaction(
                   user.wallet.wif, 
                   feeAmount, 
                   globalConfig.adminWalletAddress, 
                   globalConfig.feeForTransaction || 0
               );
               
               if (adminTxHash) {
                   console.log(`Транзакция комиссии создана, отправка: ${adminTxHash}`);
                   await sendTransaction(adminTxHash);
               } else {
                   console.error("Не удалось создать транзакцию для комиссии");
               }
           }
           
           // Обновляем баланс пользователя
           await userService.changeUserBalance({
               params: { id: user.id },
               value: user.wallet.balance - btcCount
           });
           
           // Получаем курс BTC для отображения суммы в валюте пользователя
           const currency = await currencyService.getCurrency('bitcoin');
           const userCurrency = (user as any).currency?.value?.toLowerCase() || 'rub';
           
           let currencyMessage = '';
           if (currency?.bitcoin) {
               const btcValueInUserCurrency = btcCount * currency.bitcoin[userCurrency as 'rub' | 'usd' | 'eur'];
               currencyMessage = ` (≈${currencyFormatter(btcValueInUserCurrency, userCurrency)})`;
           }
           
           // Отправляем сообщение об успешном переводе
           await ctx.reply(
               `✅ Перевод успешно выполнен!\n\n` +
               `Сумма: ${btcCount.toFixed(8)} BTC${currencyMessage}\n` +
               `Комиссия: ${feeAmount.toFixed(8)} BTC\n` +
               `Получатель: ${recipientAddress}\n\n` +
               `Хеш транзакции: \`${txHash}\``,
               { parse_mode: 'Markdown' }
           );
           
           // Очищаем данные перевода из сессии
           (ctx.session as any).transfer = {};
           
           return ctx.scene.leave();
       } catch (txError: any) {
           console.error("Ошибка при выполнении транзакции:", txError);
           return ctx.reply(`❌ Ошибка при выполнении транзакции: ${txError.message || "Неизвестная ошибка"}`);
       }
   } catch (error: any) {
       console.error("Ошибка в transferAction:", error);
       return ctx.reply(`❌ Произошла ошибка: ${error.message || "Неизвестная ошибка"}`);
   }
}