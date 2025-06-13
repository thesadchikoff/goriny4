import winston from 'winston';
import 'winston-daily-rotate-file';
import TelegramTransport from 'winston-telegram';
import path from 'path';
import fs from 'fs';
import { timeFormat } from "@/utils/time-format";

/**
 * Тип уровня логирования
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

/**
 * Тип контекста Telegram
 */
export interface TelegramContext {
  from?: {
    id?: number;
    username?: string;
    first_name?: string;
  };
  chat?: {
    id?: number;
  };
  message?: {
    text?: string;
  };
}

// Убедимся, что директория log существует
const logDir = path.resolve(process.cwd(), 'log');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Форматтер для красивого вывода
const customFormat = winston.format.printf(({ level, message, timestamp, service, ...metadata }) => {
  const metaString = Object.keys(metadata).length 
    ? `\n${JSON.stringify(metadata, null, 2)}` 
    : '';
    
  // Формат для файла логов
  return `[${timestamp}] [${level.toUpperCase()}] [${service}]: ${message}${metaString}`;
});

// Форматтер для консоли с цветами
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, service, ...metadata }) => {
    const metaString = Object.keys(metadata).length 
      ? `\n${JSON.stringify(metadata, null, 2)}` 
      : '';
      
    return `🔶 [${timestamp}] [${level}] [${service}]: ${message}${metaString}`;
  })
);

// Создаем транспорт для ежедневной ротации файлов
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.combine(
    // @ts-ignore - проблема с типами, но работает корректно
    winston.format.timestamp({ format: timeFormat }),
    customFormat
  )
});

// Транспорт для ошибок
const errorFileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '30d',
  format: winston.format.combine(
    // @ts-ignore - проблема с типами, но работает корректно
    winston.format.timestamp({ format: timeFormat }),
    customFormat
  )
});

// Проверяем наличие TELEGRAM_TOKEN в .env
let telegramTransport = null;
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
  try {
    // Проверяем валидность ID чата
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId || isNaN(Number(chatId))) {
      console.warn('Недопустимый TELEGRAM_CHAT_ID, логирование в Telegram отключено');
    } else {
      telegramTransport = new TelegramTransport({
        token: process.env.TELEGRAM_BOT_TOKEN,
        // @ts-ignore - winston-telegram использует string для chat_id, хотя в типах указано number
        chatId: process.env.TELEGRAM_CHAT_ID,
        level: 'error',
        formatMessage: ({ level, message, ...metadata }) => {
          try {
            // Ограничиваем длину метаданных для предотвращения ошибок парсинга
            const sanitizedMetadata = Object.keys(metadata).length 
              ? JSON.stringify(metadata, null, 2).substring(0, 500) 
              : '';
            
            // Проверяем наличие специальных HTML тегов и экранируем их
            const escapedMessage = message
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/&/g, '&amp;');
              
            return `🚨 [${level.toUpperCase()}]: ${escapedMessage}\n${sanitizedMetadata ? 'Детали: ' + sanitizedMetadata : ''}`;
          } catch (err) {
            return `🚨 [${level.toUpperCase()}]: ${message}`;
          }
        },
        handleExceptions: false, // Отключаем автоматическую обработку исключений
        handleRejections: false, // Отключаем автоматическую обработку отклоненных промисов
        parseMode: 'HTML',
        batchingDelay: 1000, // Группируем сообщения с задержкой в 1 секунду
        disableNotification: false,
        timeout: 10000, // Таймаут в 10 секунд для запросов к API Telegram
        retryCount: 3 // Попытки повторить отправку при ошибке
      });
      
      // Добавляем обработчик ошибок для транспорта
      telegramTransport.on('error', (error) => {
        console.error('Ошибка отправки сообщения в Telegram:', error.message);
        // Не логируем эту ошибку в Winston, чтобы избежать цикла
      });
    }
  } catch (err) {
    console.error('Ошибка при инициализации Telegram транспорта:', err);
    telegramTransport = null;
  }
}

// Создаем логгер
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'p2p-telegram-bot' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        // @ts-ignore - проблема с типами, но работает корректно
        winston.format.timestamp({ format: timeFormat }),
        consoleFormat
      ),
      handleExceptions: true
    }),
    fileRotateTransport,
    errorFileRotateTransport
  ],
  exitOnError: false // Не завершаем процесс при ошибке логирования
});

// Добавляем Telegram транспорт, если он настроен
if (telegramTransport) {
  logger.add(telegramTransport);
}

/**
 * Логирует сообщение с указанным уровнем
 * 
 * @param level Уровень логирования ('info', 'warn', 'error', 'debug', 'verbose')
 * @param message Сообщение для логирования
 * @param metadata Дополнительные метаданные
 */
export function log(level: string, message: string, metadata: any = {}) {
  logger.log(level, message, metadata);
}

/**
 * Логирует информационное сообщение
 * 
 * @param message Сообщение для логирования
 * @param metadata Дополнительные метаданные
 */
export function logInfo(message: string, metadata: any = {}) {
  logger.info(message, metadata);
}

/**
 * Логирует предупреждение
 * 
 * @param message Сообщение для логирования
 * @param metadata Дополнительные метаданные
 */
export function logWarn(message: string, metadata: any = {}) {
  logger.warn(message, metadata);
}

/**
 * Логирует ошибку
 * 
 * @param message Сообщение об ошибке
 * @param metadata Дополнительные метаданные
 */
export function logError(message: string, metadata: any = {}) {
  logger.error(message, metadata);
}

/**
 * Логирует отладочное сообщение
 * 
 * @param message Сообщение для логирования
 * @param metadata Дополнительные метаданные
 */
export function logDebug(message: string, metadata: any = {}) {
  logger.debug(message, metadata);
}

/**
 * Извлекает информацию о строке кода из стека вызовов
 * @param stack Стек вызовов
 * @returns Объект с информацией о файле, строке и функции
 */
function extractStackInfo(stack: string | undefined, functionName?: string): { 
  file: string;
  line: number | null;
  column: number | null;
  extractedFunctionName: string;
} {
  try {
    let file = 'Неизвестный файл';
    let line = null;
    let column = null;
    let extractedFunctionName = functionName || 'Неизвестная функция';

    if (!stack) {
      return { file, line, column, extractedFunctionName };
    }

    // Разбиваем стек вызовов на строки
    const lines = stack.split('\n');
    
    // Пропускаем строки, относящиеся к логированию
    const skipFiles = [
      'logger.ts', 
      'log-error-to-file.ts'
    ];
    
    // Ищем первую строку стека, которая не относится к логированию
    for (let i = 0; i < lines.length; i++) {
      const stackLine = lines[i]?.trim();
      if (!stackLine) continue;
      
      // Регулярное выражение для извлечения информации из стека
      // Формат: at [функция] ([файл]:[строка]:[колонка])
      // или:    at [файл]:[строка]:[колонка]
      const match = stackLine.match(/at (?:(.+) \()?(.+):(\d+):(\d+)\)?/);
      
      if (match) {
        try {
          const func = match[1] || 'Анонимная функция';
          const filePath = match[2] || '';
          const fileName = filePath?.split('/').pop() || 'Неизвестный файл';
          
          // Если это файл логирования, пропускаем его
          if (skipFiles.some(skipFile => fileName.includes(skipFile))) {
            continue;
          }
          
          extractedFunctionName = functionName || func;
          file = fileName;
          line = match[3] ? parseInt(match[3], 10) : null;
          column = match[4] ? parseInt(match[4], 10) : null;
          break;
        } catch (extractError) {
          // Если не удалось извлечь информацию из этой строки, продолжаем со следующей
          console.error('Ошибка при анализе строки стека:', extractError);
          continue;
        }
      }
    }

    return { file, line, column, extractedFunctionName };
  } catch (error) {
    // В случае любой ошибки при обработке стека возвращаем базовую информацию
    console.error('Ошибка при извлечении информации из стека:', error);
    return {
      file: 'Ошибка при анализе стека',
      line: null,
      column: null,
      extractedFunctionName: functionName || 'Неизвестная функция'
    };
  }
}

/**
 * Логирует ошибку с автоматическим определением контекста
 * 
 * @param errorMessage Сообщение об ошибке
 * @param functionName Имя функции, где произошла ошибка
 */
export function logErrorWithAutoDetails(errorMessage: string, functionName?: string) {
  try {
    // Получаем стек вызовов
    const stack = new Error().stack;
    const { file, line, column, extractedFunctionName } = extractStackInfo(stack, functionName);

    // Формируем метаданные
    const metadata: Record<string, any> = {
      function: extractedFunctionName,
      file
    };
    
    // Добавляем информацию о строке и колонке, если она есть
    if (line !== null) {
      metadata.line = line;
    }
    
    if (column !== null) {
      metadata.column = column;
    }

    // Логируем ошибку со всеми деталями
    logError(errorMessage, metadata);
  } catch (loggingError) {
    // В случае ошибки при логировании, используем самый простой метод
    try {
      console.error('ОШИБКА ПРИ ЛОГИРОВАНИИ:', errorMessage);
      console.error('Информация об ошибке логирования:', loggingError);
    } catch (criticalError) {
      // Последняя отчаянная попытка
      console.error('КРИТИЧЕСКАЯ ОШИБКА ЛОГИРОВАНИЯ');
    }
  }
}

/**
 * Логирует ошибку в текстовый файл
 * @param message Сообщение об ошибке
 * @param stack Стек вызовов
 * @param level Уровень ошибки
 * @param ctx Контекст ошибки
 */
export function logErrorToFile(message: string, stack?: string, level: LogLevel = 'error', ctx?: TelegramContext) {
  try {
    if (!message) {
      console.warn('Попытка логирования пустого сообщения');
      return;
    }

    // Пытаемся извлечь информацию из стека вызовов
    const { file, line, column, extractedFunctionName } = extractStackInfo(stack);

    // Формируем текст для логирования
    let logText = `[${new Date().toISOString()}] [${level.toUpperCase()}] `;
    logText += `[${file}${line ? `:${line}` : ''}] `;
    logText += `[${extractedFunctionName}] `;
    logText += message;

    // Добавляем информацию о пользователе, если есть контекст
    if (ctx) {
      try {
        const userId = ctx.from?.id || 'неизвестно';
        const username = ctx.from?.username ? `@${ctx.from.username}` : 'отсутствует';
        const name = ctx.from?.first_name || 'неизвестно';
        
        logText += `\nПользователь: ID=${userId}, Username=${username}, Name=${name}`;
      } catch (ctxError: unknown) {
        const errorMessage = ctxError instanceof Error ? ctxError.message : 'неизвестная ошибка';
        logText += `\nОшибка при получении информации о пользователе: ${errorMessage}`;
      }
    }

    // Добавляем сам стек вызовов, если он есть
    if (stack) {
      logText += `\nСтек вызовов:\n${stack}`;
    }

    // Добавляем пустую строку для читаемости
    logText += '\n\n';

    // Записываем в файл
    const logFile = getLogFilePath(level);
    fs.appendFileSync(logFile, logText, { encoding: 'utf8' });
    
    // Если это критическая ошибка, дублируем вывод в консоль
    if (level === 'critical') {
      console.error(`КРИТИЧЕСКАЯ ОШИБКА: ${message}`);
    }
  } catch (loggingError: unknown) {
    // В случае ошибки при логировании, пытаемся записать в консоль
    const errorMessage = loggingError instanceof Error ? loggingError.message : 'неизвестная ошибка';
    console.error('Ошибка при логировании в файл:', errorMessage);
    
    // Пытаемся вывести оригинальное сообщение
    try {
      console.error('Оригинальное сообщение для логирования:', message);
    } catch (consoleError) {
      // Если даже это не получилось, выводим простое сообщение
      console.error('Критическая ошибка логирования');
    }
  }
}

/**
 * Возвращает путь к файлу логов в зависимости от уровня ошибки
 * @param level Уровень логирования
 * @returns Полный путь к файлу логов
 */
function getLogFilePath(level: LogLevel): string {
  const logDir = path.resolve(process.cwd(), 'log');
  
  // Создаем директорию, если она не существует
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  switch(level) {
    case 'critical':
      return path.join(logDir, `critical-${date}.log`);
    case 'error':
      return path.join(logDir, `error-${date}.log`);
    case 'warn':
      return path.join(logDir, `warn-${date}.log`);
    case 'info':
      return path.join(logDir, `info-${date}.log`);
    case 'debug':
      return path.join(logDir, `debug-${date}.log`);
    default:
      return path.join(logDir, `app-${date}.log`);
  }
}

// Экспортируем логгер для продвинутого использования
export default logger; 