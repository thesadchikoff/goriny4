import { logErrorWithAutoDetails } from '../src/core/logs/log-error-to-file';

/**
 * Функция с глубоко вложенной ошибкой
 */
function deepestFunction() {
  // Намеренно вызываем ошибку здесь
  const arr = [1, 2, 3];
  // Доступ к несуществующему индексу
  const value = arr[10];
  
  if (value === undefined) {
    throw new Error('Индекс за пределами массива');
  }
  
  return value;
}

/**
 * Функция второго уровня
 */
function secondLevelFunction() {
  try {
    return deepestFunction();
  } catch (error: any) {
    throw new Error(`Ошибка в secondLevelFunction: ${error.message}`);
  }
}

/**
 * Функция верхнего уровня
 */
function topLevelFunction() {
  try {
    return secondLevelFunction();
  } catch (error: any) {
    // Логируем ошибку с автоматическим определением контекста
    logErrorWithAutoDetails(`Перехвачена ошибка: ${error.message}`);
    return null;
  }
}

/**
 * Вызывающая функция
 */
function runTest() {
  console.log('Запуск теста с вложенными вызовами...');
  const result = topLevelFunction();
  console.log('Результат:', result);
}

// Запускаем тест
console.log('Начало теста с вложенным логированием ошибок');
runTest();
console.log('Тест с вложенным логированием завершен'); 