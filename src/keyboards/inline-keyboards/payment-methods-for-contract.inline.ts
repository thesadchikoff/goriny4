import {InlineKeyboardButton} from "telegraf/typings/core/types/typegram";
import {PaymentMethod} from "@prisma/client";
import {prisma} from "../../prisma/prisma.client";

// Список поддерживаемых валют для каждого типа платежного метода
export const SUPPORTED_CURRENCIES: Record<string, string[]> = {
    'Сбербанк': ['RUB', 'USD', 'EUR'],
    'Тинькофф': ['RUB', 'USD', 'EUR'],
    'Альфа-Банк': ['RUB', 'USD', 'EUR'],
    'ВТБ': ['RUB', 'USD', 'EUR'],
    'Райффайзенбанк': ['RUB', 'USD', 'EUR'],
    'QIWI': ['RUB', 'USD', 'EUR'],
    'ЮMoney': ['RUB', 'USD', 'EUR'],
    'PayPal': ['USD', 'EUR'],
    'Wise': ['USD', 'EUR', 'UAH'],
    'Revolut': ['USD', 'EUR', 'UAH'],
    'Binance Pay': ['USD', 'EUR', 'UAH'],
    'USDT': ['USD'],
    'BTC': ['USD', 'EUR', 'RUB', 'UAH'],
    'Россельхоз Банк': ['RUB', 'USD', 'EUR'],
    'Wildberries Банк': ['RUB', 'USD', 'EUR']
}

export const paymentMethodsForContract = async (paymentMethods: PaymentMethod[], selectedCurrency: string): Promise<InlineKeyboardButton[][]> => {
    return paymentMethods.map(paymentMethod => {
        const supportedCurrencies = SUPPORTED_CURRENCIES[paymentMethod.name] || ['RUB', 'USD', 'EUR']
        const isSupported = supportedCurrencies.includes(selectedCurrency)
        const currencyEmoji = isSupported ? '✅' : '❌'
        
        return [{
            callback_data: paymentMethod.id.toString(),
            text: `${paymentMethod.name} ${currencyEmoji}`
        }]
    })
}