import { Context } from 'telegraf'
import fs from 'fs';
import path from 'path';
import { logErrorWithAutoDetails } from '@/core/logs/log-error-to-file';
import { prisma } from '@/prisma/prisma.client';
import * as cron from 'node-cron';
import messages from '@/config/bot.config.json'
import { logInfo } from '@/core/logs/logger';

/**
 * Получение списка файлов логов
 * @returns Объект с путями к различным типам логов
 */
const getLogFiles = () => {
  const logsDir = path.resolve(process.cwd(), 'logs');
  const files = fs.readdirSync(logsDir);
  
  // Находим последние файлы всех типов логов
  const latestAppLog = files
    .filter(file => file.startsWith('app-') && file.endsWith('.log'))
    .sort()
    .pop();
  
  const latestErrorLog = files
    .filter(file => file.startsWith('error-') && file.endsWith('.log'))
    .sort()
    .pop();
  
  // Пути к файлам
  const appLogPath = latestAppLog ? path.join(logsDir, latestAppLog) : null;
  const errorLogPath = latestErrorLog ? path.join(logsDir, latestErrorLog) : null;
  
  return {
    appLogPath,
    errorLogPath,
    logsDir,
    allLogs: {
      app: files.filter(file => file.startsWith('app-') && file.endsWith('.log')).map(file => path.join(logsDir, file)),
      error: files.filter(file => file.startsWith('error-') && file.endsWith('.log')).map(file => path.join(logsDir, file))
    },
    filesList: files.filter(file => file.endsWith('.log'))
  };
};

/**
 * Удаляет логи старше указанного возраста в днях
 * @param daysToKeep Количество дней, за которые нужно сохранить логи
 * @returns Результат операции с информацией об удаленных файлах
 */
const cleanupOldLogs = (daysToKeep = 30) => {
  try {
    const { logsDir, filesList } = getLogFiles();
    const now = new Date();
    const deletedFiles = [];
    
    // Проходим по всем файлам логов
    for (const file of filesList) {
      // Извлекаем дату из имени файла (формат app-YYYY-MM-DD.log или error-YYYY-MM-DD.log)
      const dateMatch = file.match(/-([\d]{4})-([\d]{2})-([\d]{2})\.log$/);
      
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const fileDate = new Date(`${year}-${month}-${day}`);
        
        // Вычисляем разницу в днях
        const diffTime = now.getTime() - fileDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Если файл старше указанного порога - удаляем
        if (diffDays > daysToKeep) {
          const filePath = path.join(logsDir, file);
          fs.unlinkSync(filePath);
          deletedFiles.push(file);
        }
      }
    }
    
    return {
      success: true,
      message: `Удалено ${deletedFiles.length} старых файлов логов`,
      deletedFiles
    };
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при очистке старых логов: ${error.message}`, 'cleanupOldLogs');
    return {
      success: false,
      message: `Ошибка при очистке старых логов: ${error.message}`,
      deletedFiles: []
    };
  }
};

/**
 * Команда для ручной очистки старых логов
 * @param ctx Контекст сообщения
 */
export const cleanupLogsCommand = async (ctx: Context) => {
  try {
    // Проверяем права администратора
    if (!(await checkAdminRights(ctx))) {
      return;
    }
    
    // Получаем количество дней из параметров (по умолчанию 30)
    let daysToKeep = 30;
    const message = (ctx as any).message?.text || '';
    const args = message.split(' ');
    
    if (args.length > 1 && !isNaN(parseInt(args[1]))) {
      daysToKeep = parseInt(args[1]);
    }
    
    // Выполняем очистку
    const result = cleanupOldLogs(daysToKeep);
    
    if (result.success) {
      if (result.deletedFiles.length > 0) {
        await ctx.reply(`✅ ${result.message}:\n\n${result.deletedFiles.join('\n')}`);
      } else {
        await ctx.reply(`ℹ️ Не найдено логов старше ${daysToKeep} дней для удаления.`);
      }
    } else {
      await ctx.reply(`❌ ${result.message}`);
    }
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при выполнении команды очистки логов: ${error.message}`, 'cleanupLogsCommand');
    console.error('Ошибка при выполнении команды очистки логов:', error);
    await ctx.reply('Произошла ошибка при очистке логов.');
  }
};

/**
 * Функция для запуска задачи автоматической очистки логов
 */
export const scheduleLogsCleanup = () => {
  // Запускаем задачу раз в неделю в 3:00 утра по московскому времени
  cron.schedule('0 3 * * 1', () => {
    try {
      const result = cleanupOldLogs();
      if (result.success) {
        logInfo(`Автоматическая очистка логов: ${result.message}`, {
          deletedFiles: result.deletedFiles
        });
      } else {
        logErrorWithAutoDetails(`Ошибка автоматической очистки логов: ${result.message}`, 'scheduleLogsCleanup');
      }
    } catch (error: any) {
      logErrorWithAutoDetails(`Ошибка при запуске автоматической очистки логов: ${error.message}`, 'scheduleLogsCleanup');
    }
  }, {
    timezone: 'Europe/Moscow' // Устанавливаем московское время
  });
  
  console.log('Задача автоматической очистки логов запланирована (еженедельно)');
};

/**
 * Проверка прав администратора
 * @param ctx Контекст сообщения
 * @returns Имеет ли пользователь права администратора
 */
const checkAdminRights = async (ctx: Context) => {
  // Проверяем, является ли пользователь администратором
  const userId = ctx.from?.id.toString();
  
  if (!userId) {
    await ctx.reply('Не удалось определить пользователя.');
    return false;
  }
  
  // Проверяем флаг isAdmin в базе данных
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
  });
  
  if (!user || !user.isAdmin) {
    await ctx.reply('У вас нет доступа к этой команде.');
    return false;
  }
  
  return true;
};

/**
 * Команда для выгрузки файлов логов
 * @param ctx Контекст сообщения
 */
export const getLogsCommand = async (ctx: Context) => {
  try {
    // Проверяем права администратора
    if (!(await checkAdminRights(ctx))) {
      return;
    }
    
    // Получаем пути к файлам логов
    const { appLogPath, errorLogPath } = getLogFiles();
    
    // Отправляем новые файлы логов
    if (errorLogPath) {
      await ctx.replyWithDocument({
        source: errorLogPath,
        filename: path.basename(errorLogPath)
      });
    }
    
    if (appLogPath) {
      await ctx.replyWithDocument({
        source: appLogPath,
        filename: path.basename(appLogPath)
      });
    }
    
    await ctx.reply('Файлы логов успешно отправлены.');
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при выгрузке логов: ${error.message}`, 'getLogsCommand');
    console.error('Ошибка при выгрузке логов:', error);
    await ctx.reply('Произошла ошибка при выгрузке логов.');
  }
};

/**
 * Команда для получения списка доступных файлов логов
 * @param ctx Контекст сообщения
 */
export const getLogsListCommand = async (ctx: Context) => {
  try {
    // Проверяем права администратора
    if (!(await checkAdminRights(ctx))) {
      return;
    }
    
    // Получаем список файлов логов
    const { filesList } = getLogFiles();
    
    // Формируем сообщение со списком файлов
    const fileListMessage = filesList
      .map(file => `• ${file}`)
      .join('\n');
    
    await ctx.reply(`📋 Доступные файлы логов:\n\n${fileListMessage}\n\nДля получения конкретного файла используйте команду /getlog имя_файла`);
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при получении списка логов: ${error.message}`, 'getLogsListCommand');
    console.error('Ошибка при получении списка логов:', error);
    await ctx.reply('Произошла ошибка при получении списка логов.');
  }
};

/**
 * Команда для выгрузки конкретного файла лога
 * @param ctx Контекст сообщения
 */
export const getSpecificLogCommand = async (ctx: any) => {
  try {
    // Проверяем права администратора
    if (!(await checkAdminRights(ctx))) {
      return;
    }
    
    // Получаем имя файла из аргументов команды
    const message = ctx.message.text;
    const args = message.split(' ');
    
    if (args.length < 2) {
      await ctx.reply('Укажите имя файла лога, например: /getlog app-2023-06-01.log');
      return;
    }
    
    const fileName = args[1];
    const { logsDir, filesList } = getLogFiles();
    
    // Проверяем существование файла
    if (!filesList.includes(fileName)) {
      await ctx.reply(`Файл "${fileName}" не найден. Используйте команду /getlogslist для просмотра доступных файлов.`);
      return;
    }
    
    const filePath = path.join(logsDir, fileName);
    
    // Отправляем запрошенный файл
    await ctx.replyWithDocument({
      source: filePath,
      filename: fileName
    });
    
    await ctx.reply(`Файл "${fileName}" успешно отправлен.`);
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при выгрузке конкретного лога: ${error.message}`, 'getSpecificLogCommand');
    console.error('Ошибка при выгрузке конкретного лога:', error);
    await ctx.reply('Произошла ошибка при выгрузке файла лога.');
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
      // Получаем пути к файлам логов
      const { appLogPath, errorLogPath } = getLogFiles();
      
      // Формируем сообщение
      const caption = '📊 Ежедневный отчет логов';
      
      // Отправляем файлы логов
      if (errorLogPath) {
        await bot.telegram.sendDocument(
          messages.App.GroupId,
          { source: errorLogPath, filename: path.basename(errorLogPath) },
          { caption: `${caption} - Ошибки` }
        );
      }
      
      if (appLogPath) {
        await bot.telegram.sendDocument(
          messages.App.GroupId,
          { source: appLogPath, filename: path.basename(appLogPath) },
          { caption: `${caption} - Все логи` }
        );
      }
      
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
 * Команда для выгрузки файлов логов в общий чат
 * @param ctx Контекст сообщения
 */
export const getLogsGroupCommand = async (ctx: Context) => {
  try {
    // Проверяем права администратора
    if (!(await checkAdminRights(ctx))) {
      return;
    }
    
    // Проверяем, что команда вызвана в нужном чате
    if (ctx.chat?.id.toString() !== messages.App.GroupId) {
      await ctx.reply('Эта команда доступна только в общем чате администраторов.');
      return;
    }
    
    // Получаем пути к файлам логов
    const { appLogPath, errorLogPath } = getLogFiles();
    
    // Отправляем новые файлы логов
    if (errorLogPath) {
      await ctx.replyWithDocument({
        source: errorLogPath,
        filename: path.basename(errorLogPath)
      });
    }
    
    if (appLogPath) {
      await ctx.replyWithDocument({
        source: appLogPath,
        filename: path.basename(appLogPath)
      });
    }
    
    await ctx.reply('Файлы логов успешно отправлены.');
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при выгрузке логов в групповом чате: ${error.message}`, 'getLogsGroupCommand');
    console.error('Ошибка при выгрузке логов в групповом чате:', error);
    await ctx.reply('Произошла ошибка при выгрузке логов.');
  }
}; 