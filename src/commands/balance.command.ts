import { Context, Markup } from 'telegraf';
import { BalanceService } from '@/models/user-balance';

// Команда для просмотра баланса
export const balanceCommand = async (ctx: Context) => {
    if (!ctx.from) {
        return;
    }
    
    // Получаем баланс пользователя
    const balance = await BalanceService.getUserBalance(ctx.from.id);
    
    // Создаем клавиатуру с действиями
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Пополнить баланс', 'deposit_balance')],
        [Markup.button.callback('Вывести средства', 'withdraw_balance')],
        [Markup.button.callback('История транзакций', 'transaction_history')]
    ]);
    
    await ctx.reply(
        `Ваш текущий баланс: ${balance} звезд\n\n` +
        'Выберите действие:',
        keyboard
    );
};

// Создаем сцену для вывода баланса
import { Scenes } from 'telegraf';

interface WithdrawWizardSession extends Scenes.WizardSessionData {
    withdrawData?: {
        amount: number;
    };
}

type WithdrawWizardContext = Scenes.WizardContext<WithdrawWizardSession>;

export const withdrawScene = new Scenes.WizardScene<WithdrawWizardContext>(
    'withdraw_balance',
    // Шаг 1: Запрос суммы для вывода
    async (ctx) => {
        // Получаем текущий баланс
        if (!ctx.from) {
            return ctx.scene.leave();
        }
        
        const balance = await BalanceService.getUserBalance(ctx.from.id);
        
        await ctx.reply(
            `Ваш текущий баланс: ${balance} звезд\n\n` +
            'Введите сумму для вывода:'
        );
        
        return ctx.wizard.next();
    },
    // Шаг 2: Обработка суммы и запрос реквизитов
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message) || !ctx.from) {
            await ctx.reply('Пожалуйста, введите сумму числом');
            return;
        }
        
        const amount = parseInt(ctx.message.text);
        if (isNaN(amount) || amount <= 0) {
            await ctx.reply('Пожалуйста, введите корректную сумму');
            return;
        }
        
        // Проверяем, достаточно ли средств
        const balance = await BalanceService.getUserBalance(ctx.from.id);
        if (balance < amount) {
            await ctx.reply(`Недостаточно средств. Ваш баланс: ${balance} звезд`);
            return ctx.scene.leave();
        }
        
        // Сохраняем сумму в состоянии
        if (ctx.wizard.state) {
            (ctx.wizard.state as any).withdrawData = { amount };
        }
        
        await ctx.reply(
            `Вы запросили вывод ${amount} звезд\n\n` +
            'Введите реквизиты для вывода (например, номер кошелька или @ username):'
        );
        
        return ctx.wizard.next();
    },
    // Шаг 3: Подтверждение вывода
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message) || !ctx.from) {
            await ctx.reply('Пожалуйста, введите реквизиты для вывода');
            return;
        }
        
        const requisites = ctx.message.text;
        const amount = ctx.wizard.state && (ctx.wizard.state as any).withdrawData ? 
            (ctx.wizard.state as any).withdrawData.amount : 0;
        
        // Создаем клавиатуру для подтверждения
        const keyboard = Markup.inlineKeyboard([
            Markup.button.callback('Подтвердить', 'confirm_withdraw'),
            Markup.button.callback('Отмена', 'cancel_withdraw')
        ]);
        
        await ctx.reply(
            `Подтвердите вывод:\n\n` +
            `Сумма: ${amount} звезд\n` +
            `Реквизиты: ${requisites}\n\n` +
            'Внимание: вывод средств обрабатывается вручную администратором. ' +
            'Пожалуйста, убедитесь в правильности введенных данных.',
            keyboard
        );
        
        // Сохраняем реквизиты
        if (ctx.wizard.state && (ctx.wizard.state as any).withdrawData) {
            (ctx.wizard.state as any).withdrawData.requisites = requisites;
        }
        
        return ctx.wizard.next();
    },
    // Шаг 4: Ожидание подтверждения
    async (ctx) => {
        // Этот шаг только ждет колбэков
        return;
    }
);

// Добавляем обработчики действий
withdrawScene.action('confirm_withdraw', async (ctx) => {
    if (!ctx.from) {
        return ctx.scene.leave();
    }
    
    const withdrawData = ctx.wizard.state && (ctx.wizard.state as any).withdrawData;
    if (!withdrawData) {
        await ctx.reply('Произошла ошибка при обработке запроса');
        return ctx.scene.leave();
    }
    
    const { amount, requisites } = withdrawData;
    
    // Снимаем средства с баланса
    const success = await BalanceService.withdrawFromBalance(ctx.from.id, amount);
    
    if (success) {
        // Логируем транзакцию
        await BalanceService.logTransaction(
            ctx.from.id,
            amount,
            'withdrawal',
            `Вывод средств на реквизиты: ${requisites}`
        );
        
        // Отправляем уведомление администратору
        // Здесь нужно заменить ADMIN_ID на реальный ID администратора
        const ADMIN_ID = process.env.ADMIN_ID || '123456789';
        await ctx.telegram.sendMessage(
            ADMIN_ID,
            `Запрос на вывод средств:\n\n` +
            `Пользователь: ${ctx.from.username || ctx.from.id}\n` +
            `Сумма: ${amount} звезд\n` +
            `Реквизиты: ${requisites}`
        );
        
        await ctx.reply(
            'Ваш запрос на вывод средств принят!\n\n' +
            'Средства будут переведены в ближайшее время. ' +
            'Администратор свяжется с вами при необходимости.'
        );
    } else {
        await ctx.reply('Ошибка при выводе средств. Недостаточно средств на балансе.');
    }
    
    return ctx.scene.leave();
});

withdrawScene.action('cancel_withdraw', async (ctx) => {
    await ctx.reply('Вывод средств отменен');
    return ctx.scene.leave();
}); 