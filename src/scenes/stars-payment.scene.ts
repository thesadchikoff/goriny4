import { Scenes } from 'telegraf';
import { Markup } from 'telegraf';

interface StarsPaymentWizardSession extends Scenes.WizardSessionData {
    paymentData?: {
        amount: number;
    };
}

type StarsPaymentWizardContext = Scenes.WizardContext<StarsPaymentWizardSession>;

const starsPaymentScene = new Scenes.WizardScene<StarsPaymentWizardContext>(
    'stars_payment',
    async (ctx) => {
        await ctx.reply('Введите количество звезд для оплаты:');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Пожалуйста, отправьте количество звезд текстовым сообщением');
            return;
        }

        const amount = parseInt(ctx.message.text);
        if (isNaN(amount) || amount <= 0) {
            await ctx.reply('Пожалуйста, введите корректное количество звезд');
            return;
        }

        if (ctx.wizard.state) {
            (ctx.wizard.state as any).paymentData = { amount };
        }

        try {
            // Создаем платежное сообщение с запросом на звезды
            await ctx.replyWithInvoice({
                title: 'Оплата услуг',
                description: `Оплата ${amount} звездами Telegram`,
                payload: `stars_payment_${Date.now()}`,
                provider_token: 'stars', // Специальный токен для оплаты звездами
                currency: 'XTR', // Валюта для звезд Telegram
                prices: [{ label: 'Оплата', amount: amount }], // Убираем умножение на 100
                max_tip_amount: 0,
                suggested_tip_amounts: [],
                start_parameter: 'pay',
                provider_data: JSON.stringify({ 
                    pay_with_stars: true 
                })
            });

            // Отправляем дополнительное сообщение с кнопкой для отмены
            const cancelKeyboard = Markup.inlineKeyboard([
                Markup.button.callback('Отменить платеж', 'cancel_payment')
            ]);

            await ctx.reply('Пожалуйста, оплатите счет или нажмите отмена для возврата.', cancelKeyboard);
            
            return ctx.wizard.next();
        } catch (error) {
            console.error('Payment error:', error);
            await ctx.reply('Произошла ошибка при создании платежа');
            return ctx.scene.leave();
        }
    },
    async (ctx) => {
        // Этот шаг будет ждать результатов оплаты
        // Сценарий будет выходить из этого состояния через внешние обработчики
        return;
    }
);

// Добавляем обработчик успешной оплаты
starsPaymentScene.action('cancel_payment', async (ctx) => {
    await ctx.reply('Платеж отменен');
    return ctx.scene.leave();
});

export default starsPaymentScene; 