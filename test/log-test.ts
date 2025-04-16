import { logErrorWithAutoDetails } from '../src/core/logs/log-error-to-file';

/**
 * Функция, которая вызывает ошибку
 */
function functionWithError() {
  try {
    // Намеренно вызываем ошибку
    const obj: any = null;
    // Следующая строка вызовет ошибку
    const value = obj.someProp;
    return value;
  } catch (error: any) {
    // Логируем ошибку с автоматическим определением контекста
    logErrorWithAutoDetails(`Произошла тестовая ошибка: ${error.message}`);
    return null;
  }
}

/**
 * Вызывающая функция
 */
function callErrorFunction() {
  console.log('Вызываем функцию с ошибкой...');
  const result = functionWithError();
  console.log('Результат:', result);
}

// Запускаем тест
console.log('Начало теста логирования ошибок');
callErrorFunction();
console.log('Тест логирования ошибок завершен'); 