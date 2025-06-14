import {prisma} from "@/config/prisma";
import {BotContext} from "@/@types/scenes";

type ManageCoins = {
    coinsCount: number,
    userIdOrLogin: string,
    manageOptions: 'ADD' | 'SET' | 'REMOVE' | 'RESET',
}

export const manageCoins = async (ctx: BotContext, {coinsCount, userIdOrLogin, manageOptions}: ManageCoins) => {
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                {login: userIdOrLogin},
                { id: userIdOrLogin },
                { username: userIdOrLogin },
            ]
        }
    })

    if (!user) {
        return ctx.reply('❌ Пользователь не найден.')
    }

    if (!user.walletId) {
        return ctx.reply('❌ У пользователя не подключен кошелек.')
    }

    const wallet = await prisma.wallet.findFirst({
        where: {
            id: user.walletId
        }
    })

    if (manageOptions === 'ADD') {
        await prisma.wallet.update({
            where: {
                id: user.walletId
            },
            data: {
                balance: wallet!.balance + coinsCount
            }
        })

        return ctx.reply(`<b>Оповещение</b>\n\n${formatCoins(coinsCount)} начислено пользователю ${user.login} ${user.username ? `[@${user.username}]` : ''}.\n\nТекущий баланс ${formatCoins(wallet!.balance + coinsCount)}.\n\n<b>⚠️ Внимание!</b>\n\nПеред пополнением баланса обязательно спишите с пользователя тестовые монеты.`, {
            parse_mode: 'HTML'
        })
    }

    if (manageOptions === 'SET') {
        if (coinsCount < 0) {
            return ctx.reply("❌ Нельзя установить отрицательный баланс пользователю")
        }
        await prisma.wallet.update({
            where: {
                id: user.walletId
            },
            data: {
                balance: coinsCount
            }
        })

        return ctx.reply(`<b>Оповещение</b>\n\nКоличество монет у пользователя ${user.login} ${user.username ? `[@${user.username}]` : ''} изменено на <code>${formatCoins(coinsCount)}</code>.\n\n<b>⚠️ Внимание!</b>\n\nПеред пополнением баланса обязательно спишите с пользователя тестовые монеты.`, {
            parse_mode: 'HTML'
        })
    }

    if (manageOptions === 'REMOVE') {
        if (!deductBalance({balance: wallet!.balance}, coinsCount)) {
            return ctx.reply("❌ Нельзя установить отрицательный баланс пользователю")
        }
        await prisma.wallet.update({
            where: {
                id: user.walletId
            },
            data: {
                balance: wallet!.balance - coinsCount
            }
        })

        return ctx.reply(`<b>Оповещение</b>\n\n${formatCoins(coinsCount)} списано у пользователя ${user.login} ${user.username ? `[@${user.username}]` : ''}.\n\nТекущий баланс ${formatCoins(wallet!.balance - coinsCount)}.\n\n<b>⚠️ Внимание!</b>\n\nПеред пополнением баланса обязательно спишите с пользователя тестовые монеты.`, {
            parse_mode: 'HTML'
        })
    }

    if (manageOptions === 'RESET') {
        await prisma.wallet.update({
            where: {
                id: user.walletId
            },
            data: {
                balance: 0
            }
        })

        return ctx.reply(`<b>Оповещение</b>\n\nБаланс пользователя ${user.login} ${user.username ? `[@${user.username}]` : ''} обнулен.\n\n<b>⚠️ Внимание!</b>\n\nПеред пополнением баланса обязательно спишите с пользователя тестовые монеты.`, {
            parse_mode: 'HTML'
        })
    }
}

function deductBalance(wallet: { balance: number }, coinsCount: number): boolean {
    if (wallet.balance < coinsCount) {
        return false; // недостаточно средств
    }

    wallet.balance -= coinsCount;
    return true; // успешно списано
}

function formatCoins(count: number): string {
    const absCount = Math.abs(count);
    const lastDigit = absCount % 10;
    const lastTwoDigits = absCount % 100;

    let word = 'монет';
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        word = 'монет';
    } else if (lastDigit === 1) {
        word = 'монета';
    } else if (lastDigit >= 2 && lastDigit <= 4) {
        word = 'монеты';
    }

    return `${count} ${word}`;
}
