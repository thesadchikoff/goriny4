import fs from 'fs';
import path from 'path';
import {timeFormat} from "@/utils/time-format";
import { logErrorWithAutoDetails as newLogErrorWithAutoDetails } from './logger';

/**
 * Логирует ошибку с автоматическим определением контекста
 * Включает файл, функцию, номер строки и колонки, где произошла ошибка
 * @param errorMessage Сообщение об ошибке
 * @param functionName Имя функции, где произошла ошибка (опционально)
 */
export function logErrorWithAutoDetails(errorMessage: string, functionName?: string) {
    // Использует новую функцию логирования
    newLogErrorWithAutoDetails(errorMessage, functionName);
}

/**
 * Логирует ошибку с указанием контекста
 * Включает файл, функцию, номер строки и колонки, где произошла ошибка
 * @param errorMessage Сообщение об ошибке
 * @param functionName Имя функции, где произошла ошибка
 * @param fileName Имя файла, где произошла ошибка
 */
export function logErrorToFile(errorMessage: string, functionName: string, fileName: string) {
    // Перенаправляет на новую функцию логирования
    newLogErrorWithAutoDetails(errorMessage, functionName);
}
