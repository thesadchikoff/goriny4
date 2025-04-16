import { prisma } from '../config/prisma'

const BOT_STATE_KEY = 'bot_state'

export const setBotActive = async (isActive: boolean) => {
    await prisma.globalConfig.upsert({
        where: { key: BOT_STATE_KEY },
        update: { value: isActive.toString(), isActive },
        create: { key: BOT_STATE_KEY, value: isActive.toString(), isActive }
    })
}

export const isBotActive = async () => {
    const config = await prisma.globalConfig.findUnique({
        where: { key: BOT_STATE_KEY }
    })
    return config?.isActive ?? true
} 