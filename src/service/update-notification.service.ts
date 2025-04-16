import { prisma } from '@/prisma/prisma.client'
import { BotContext } from '@/@types/scenes'
import { versionService } from './version.service'
import userService from '@/db/user.service'
import { bot } from '@/config/bot'

class UpdateNotificationService {
  /**
   * Создает новую запись об обновлении бота
   */
  async createUpdate(title: string, description: string): Promise<void> {
    const currentVersion = versionService.getVersion()
    
    await prisma.botUpdate.create({
      data: {
        version: currentVersion,
        title,
        description,
        isActive: true
      }
    })
  }

  /**
   * Получает последнее активное обновление
   */
  async getLatestUpdate() {
    return prisma.botUpdate.findFirst({
      where: {
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  /**
   * Отправляет уведомление об обновлении всем пользователям
   */
  async sendUpdateNotificationToAllUsers(): Promise<void> {
    console.log('Начинаем отправку уведомлений всем пользователям')
    
    const update = await this.getLatestUpdate()
    if (!update) {
      console.log('Нет активных обновлений для отправки')
      return
    }
    
    console.log('Найдено обновление:', update)

    const users = await userService.fetchAll()
    console.log(`Найдено ${users.length} пользователей для отправки уведомлений`)
    
    for (const user of users) {
      try {
        console.log(`Обработка пользователя: ${user.id}`)
        
        // Проверяем, получал ли пользователь уже это уведомление
        const userWithNotification = await prisma.user.findUnique({
          where: { id: user.id },
          select: { lastUpdateNotification: true }
        })
        
        if (userWithNotification?.lastUpdateNotification && 
            userWithNotification.lastUpdateNotification >= update.createdAt) {
          console.log(`Пользователь ${user.id} уже получал это уведомление, пропускаем`)
          continue
        }
        
        console.log(`Отправляем уведомление пользователю ${user.id}`)
        
        // Отправляем уведомление с улучшенным форматированием
        await bot.telegram.sendMessage(
          user.id,
          `🚀 <b>Обновление бота</b>\n\n` +
          `📌 <b>${update.title}</b>\n\n` +
          `${update.description}\n\n` +
          `📊 <b>Версия:</b> <code>${update.version}</code>\n` +
          `📅 <b>Дата:</b> ${update.createdAt.toLocaleString('ru-RU')}\n\n` +
          `Спасибо, что используете нашего бота! 🙏`,
          { parse_mode: 'HTML' }
        )
        
        console.log(`Уведомление успешно отправлено пользователю ${user.id}`)
        
        // Обновляем дату последнего уведомления
        await prisma.user.update({
          where: { id: user.id },
          data: { lastUpdateNotification: new Date() }
        })
        
        console.log(`Обновлена дата последнего уведомления для пользователя ${user.id}`)
      } catch (error) {
        console.error(`Ошибка при отправке уведомления пользователю ${user.id}:`, error)
      }
    }
    
    console.log('Отправка уведомлений завершена')
  }

  /**
   * Отправляет уведомление об обновлении конкретному пользователю
   */
  async sendUpdateNotificationToUser(ctx: BotContext): Promise<void> {
    const update = await this.getLatestUpdate()
    if (!update) return

    const user = await userService.fetchOneById({ id: ctx.from!.id })
    if (!user) return

    // Проверяем, получал ли пользователь уже это уведомление
    const userWithNotification = await prisma.user.findUnique({
      where: { id: user.id },
      select: { lastUpdateNotification: true }
    })
    
    if (userWithNotification?.lastUpdateNotification && 
        userWithNotification.lastUpdateNotification >= update.createdAt) {
      return
    }

    // Отправляем уведомление с улучшенным форматированием
    await ctx.reply(
      `🚀 <b>Обновление бота</b>\n\n` +
      `📌 <b>${update.title}</b>\n\n` +
      `${update.description}\n\n` +
      `📊 <b>Версия:</b> <code>${update.version}</code>\n` +
      `📅 <b>Дата:</b> ${update.createdAt.toLocaleString('ru-RU')}\n\n` +
      `Спасибо, что используете нашего бота! 🙏`,
      { parse_mode: 'HTML' }
    )

    // Обновляем дату последнего уведомления
    await prisma.user.update({
      where: { id: user.id },
      data: { lastUpdateNotification: new Date() }
    })
  }
}

export const updateNotificationService = new UpdateNotificationService() 