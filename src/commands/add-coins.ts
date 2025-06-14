import {BotContext} from "@/@types/scenes";
import {prisma} from "@/config/prisma";
import {manageCoins} from "@/actions/manageCoins";
import {checkAdminRights} from "@/commands/get-logs.command";

const allowedOptions = ['ADD', 'SET', 'REMOVE', 'RESET'] as const;

export const addCoins = async (ctx: BotContext) => {
    if (!(await checkAdminRights(ctx))) {
        return;
    }
    const userLogin = ctx.text!.split(' ')
    const option = userLogin[1].toUpperCase() as 'ADD' | 'SET' | 'REMOVE' | 'RESET'
    const login = userLogin[2]
    const coinsCount = Number(userLogin[3])

    if (!allowedOptions.includes(option as typeof allowedOptions[number])) {
        throw new Error(`Недопустимое значение: ${option}`);
    }

    if (!isValidNumber(coinsCount)) {
        return ctx.reply('Указано неверное количество монет.')
    }
    return manageCoins(ctx, {
        coinsCount,
        manageOptions: option,
        userIdOrLogin: login,
    })
}

function isValidNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}
