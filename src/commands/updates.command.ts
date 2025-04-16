import { BotContext } from '@/@types/scenes'
import { updateNotificationService } from '@/service/update-notification.service'
import { versionService } from '@/service/version.service'
import userService from '@/db/user.service'
import { Message } from 'telegraf/typings/core/types/typegram'
import { bot } from '@/config/bot'

/**
 * Команда для создания нового уведомления об обновлении
 * Формат: /updates create "Заголовок" "Описание"
 */
export const createUpdateCommand = async (ctx: BotContext) => {
  try {
    // Проверяем, является ли пользователь администратором
    const user = await userService.fetchOneById({ id: ctx.from!.id })
    if (!user || !user.isAdmin) {
      return ctx.reply('⛔️ У вас нет прав для выполнения этой команды')
    }

    // Проверяем формат команды
    const messageText = (ctx.message as Message.TextMessage).text
    
    // Используем регулярное выражение для извлечения заголовка и описания в кавычках
    const titleMatch = messageText.match(/\/updates create "([^"]+)" "([^"]+)"/)
    
    if (!titleMatch) {
      return ctx.reply(
        '❌ Неверный формат команды\n\n' +
        'Используйте: /updates create "Заголовок" "Описание"\n\n' +
        'Пример: /updates create "Новый функционал" "Добавлена возможность создания контрактов"'
      )
    }
    
    // Извлекаем заголовок и описание из регулярного выражения
    const title = titleMatch[1]
    const description = titleMatch[2]

    // Создаем уведомление
    await updateNotificationService.createUpdate(title, description)

    return ctx.reply(
      '✅ Уведомление об обновлении успешно создано\n\n' +
      `Заголовок: ${title}\n` +
      `Описание: ${description}\n` +
      `Версия: ${versionService.getVersion()}`
    )
  } catch (error) {
    console.error('[CREATE_UPDATE] Error:', error)
    return ctx.reply('❌ Произошла ошибка при создании уведомления')
  }
}

/**
 * Команда для отправки уведомления об обновлении всем пользователям
 * Формат: /updates send
 */
export const sendUpdateCommand = async (ctx: BotContext) => {
  try {
    // Проверяем, является ли пользователь администратором
    const user = await userService.fetchOneById({ id: ctx.from!.id })
    if (!user || !user.isAdmin) {
      return ctx.reply('⛔️ У вас нет прав для выполнения этой команды')
    }

    // Отправляем уведомление всем пользователям
    await updateNotificationService.sendUpdateNotificationToAllUsers()

    return ctx.reply('✅ Уведомление об обновлении успешно отправлено всем пользователям')
  } catch (error) {
    console.error('[SEND_UPDATE] Error:', error)
    return ctx.reply('❌ Произошла ошибка при отправке уведомления')
  }
}

/**
 * Команда для просмотра последнего уведомления об обновлении
 * Формат: /updates info
 */
export const updateInfoCommand = async (ctx: BotContext) => {
  try {
    const update = await updateNotificationService.getLatestUpdate()
    
    if (!update) {
      return ctx.reply('ℹ️ Нет активных уведомлений об обновлениях')
    }

    return ctx.reply(
      `🚀 <b>Последнее обновление бота</b>\n\n` +
      `📌 <b>${update.title}</b>\n\n` +
      `${update.description}\n\n` +
      `📊 <b>Версия:</b> <code>${update.version}</code>\n` +
      `📅 <b>Дата:</b> ${update.createdAt.toLocaleString('ru-RU')}`,
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    console.error('[UPDATE_INFO] Error:', error)
    return ctx.reply('❌ Произошла ошибка при получении информации об обновлении')
  }
}

/**
 * Обработчик команды /updates
 */
export const updatesCommand = async (ctx: BotContext) => {
  try {
    const messageText = (ctx.message as Message.TextMessage).text
    const args = messageText.split(' ')
    
    if (!args || args.length < 2) {
      return ctx.reply(
        'ℹ️ Команды для работы с обновлениями:\n\n' +
        '/updates create "Заголовок" "Описание" - создать новое уведомление\n' +
        '/updates send - отправить уведомление всем пользователям\n' +
        '/updates info - просмотреть последнее уведомление'
      )
    }

    const subcommand = args[1]

    switch (subcommand) {
      case 'create':
        return createUpdateCommand(ctx)
      case 'send':
        return sendUpdateCommand(ctx)
      case 'info':
        return updateInfoCommand(ctx)
      default:
        return ctx.reply(
          '❌ Неизвестная подкоманда\n\n' +
          'Доступные подкоманды:\n' +
          'create - создать новое уведомление\n' +
          'send - отправить уведомление всем пользователям\n' +
          'info - просмотреть последнее уведомление'
        )
    }
  } catch (error) {
    console.error('[UPDATES_COMMAND] Error:', error)
    return ctx.reply('❌ Произошла ошибка при выполнении команды')
  }
} 