import { Context, Markup, Scenes } from 'telegraf';

// Создаем сцену для тестового платежа
const testPaymentScene = new Scenes.WizardScene<Scenes.WizardContext>(
    'test_payment',
    // Первый шаг - запрос суммы
    async (ctx) => {
        await ctx.reply('Тестовый режим: Введите количество звезд для имитации оплаты:');
        return ctx.wizard.next();
    },
    // Второй шаг - обработка введенной суммы
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Пожалуйста, отправьте сумму текстовым сообщением');
            return;
        }

        const text = ctx.message.text;
        if (!/^\d+$/.test(text)) {
            await ctx.reply('Пожалуйста, введите корректное число звезд');
            return;
        }
        
        const amount = parseInt(text);
        
        // Сохраняем сумму в состоянии
        ctx.wizard.state.amount = amount;
        
        // Шаг 2: Имитация платежа
        const keyboard = Markup.inlineKeyboard([
            Markup.button.callback('Имитировать успешный платеж', 'test_success_payment'),
            Markup.button.callback('Имитировать отмену платежа', 'test_cancel_payment'),
        ]);
        
        await ctx.reply(
            `Тестовый режим: Имитация оплаты ${amount} звезд\n\n` +
            'Выберите результат платежа:',
            keyboard
        );
        
        return ctx.wizard.next();
    },
    // Третий шаг - ожидание выбора пользователя
    async (ctx) => {
        // Здесь просто ожидаем callback-запросы
        return;
    }
);

// Добавляем обработчики для кнопок
testPaymentScene.action('test_success_payment', async (ctx) => {
    const amount = ctx.wizard.state.amount || 0;
    await ctx.reply(`Тестовый режим: Успешная оплата ${amount} звезд имитирована.`);
    
    // Здесь можно добавить логику для обработки успешного платежа
    
    return ctx.scene.leave();
});

testPaymentScene.action('test_cancel_payment', async (ctx) => {
    await ctx.reply('Тестовый режим: Платеж отменен.');
    return ctx.scene.leave();
});

// Экспортируем сцену для добавления в Stage
export const testPaymentSceneExport = testPaymentScene;

// Экспортируем команду для запуска сцены
export const testStarsPaymentCommand = async (ctx: Context & { scene: Scenes.SceneContextScene<any> }) => {
    await ctx.scene.enter('test_payment');
}; 