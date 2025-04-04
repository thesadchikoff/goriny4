import {InlineKeyboardButton} from "telegraf/typings/core/types/typegram";
import {PaymentMethod} from "@prisma/client";

export const paymentMethodsForContract = (paymentMethods: PaymentMethod[]): InlineKeyboardButton[][] => {
    return paymentMethods.map(paymentMethod => ([{
        callback_data: paymentMethod.id.toString(),
        text: paymentMethod.name
    }]))
}