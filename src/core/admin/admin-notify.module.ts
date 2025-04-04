import admin from "@/db/admin";
import {bot} from "@/config/bot";
import {InlineKeyboardButton} from "telegraf/typings/core/types/typegram";

class AdminNotifyModule {
    constructor() {}



    async sendNotify(message: string, buttons: InlineKeyboardButton[][] = [[]]) {
        const admins = await admin.getAdmins()
        admins.forEach( admin => {
            bot.telegram.sendMessage(admin.id, message, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons
                }
            })
        })
    }
}

export default new AdminNotifyModule();