import { Context } from 'telegraf';
import { BotContext } from '@/@types/scenes';
import fs from 'fs';
import path from 'path';
import { logErrorWithAutoDetails } from '@/core/logs/log-error-to-file';
import { prisma } from '@/prisma/prisma.client';
import * as cron from 'node-cron';
import messages from '@/config/bot.config.json'

/**
 * Команда для выгрузки файла logs.txt
 * @param ctx Контекст сообщения
 */
export const getLogsCommand = async (ctx: Context) => {
  try {
    // Проверяем, является ли пользователь администратором
    const userId = ctx.from?.id.toString();
    
    if (!userId) {
      await ctx.reply('Не удалось определить пользователя.');
      return;
    }
    
    // Проверяем флаг isAdmin в базе данных
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });
    
    if (!user || !user.isAdmin) {
      await ctx.reply('У вас нет доступа к этой команде.');
      return;
    }
    
    // Путь к файлу логов
    const logsPath = path.resolve(process.cwd(), 'logs', 'logs.txt');
    
    // Проверяем существование файла
    if (!fs.existsSync(logsPath)) {
      await ctx.reply('Файл логов не найден.');
      return;
    }
    
    // Отправляем файл
    await ctx.replyWithDocument({
      source: logsPath,
      filename: 'logs.txt'
    });
    
    await ctx.reply('Файл логов успешно отправлен.');
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при выгрузке логов: ${error.message}`, 'getLogsCommand');
    console.error('Ошибка при выгрузке логов:', error);
    await ctx.reply('Произошла ошибка при выгрузке логов.');
  }
};

/**
 * Функция для отправки логов в чат по расписанию
 * @param bot Экземпляр бота
 */
export const scheduleLogsDelivery = (bot: any) => {
  // Запускаем задачу каждый день в 9:00 по московскому времени
  cron.schedule('0 9 * * *', async () => {
    try {
      // Путь к файлу логов
      const logsPath = path.resolve(process.cwd(), 'logs', 'logs.txt');
      
      // Проверяем существование файла
      if (!fs.existsSync(logsPath)) {
        console.error('Файл логов не найден для ежедневной отправки');
        return;
      }
      
      // Отправляем файл в указанный чат
      await bot.telegram.sendDocument(
        messages.App.GroupId, // ID чата
        { source: logsPath, filename: 'logs.txt' },
        { caption: '📊 Ежедневный отчет логов' }
      );
      
      console.log('Ежедневный отчет логов успешно отправлен');
    } catch (error: any) {
      logErrorWithAutoDetails(`Ошибка при отправке ежедневного отчета логов: ${error.message}`, 'scheduleLogsDelivery');
      console.error('Ошибка при отправке ежедневного отчета логов:', error);
    }
  }, {
    timezone: 'Europe/Moscow' // Устанавливаем московское время
  });
  
  console.log('Задача ежедневной отправки логов запланирована');
};

/**
 * Команда для выгрузки файла logs.txt в общий чат
 * @param ctx Контекст сообщения
 */
export const getLogsGroupCommand = async (ctx: Context) => {
  try {
    // Проверяем, является ли пользователь администратором
    const userId = ctx.from?.id.toString();
    
    if (!userId) {
      await ctx.reply('Не удалось определить пользователя.');
      return;
    }
    
    // Проверяем флаг isAdmin в базе данных
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });
    
    if (!user || !user.isAdmin) {
      await ctx.reply('У вас нет доступа к этой команде.');
      return;
    }
    
    // Проверяем, что команда вызвана в нужном чате
    if (ctx.chat?.id.toString() !== messages.App.GroupId) {
      await ctx.reply('Эта команда доступна только в общем чате администраторов.');
      return;
    }
    
    // Путь к файлу логов
    const logsPath = path.resolve(process.cwd(), 'logs', 'logs.txt');
    
    // Проверяем существование файла
    if (!fs.existsSync(logsPath)) {
      await ctx.reply('Файл логов не найден.');
      return;
    }
    
    // Отправляем файл
    await ctx.replyWithDocument({
      source: logsPath,
      filename: 'logs.txt'
    });
    
    await ctx.reply('Файл логов успешно отправлен.');
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при выгрузке логов в групповом чате: ${error.message}`, 'getLogsGroupCommand');
    console.error('Ошибка при выгрузке логов в групповом чате:', error);
    await ctx.reply('Произошла ошибка при выгрузке логов.');
  }
}; 