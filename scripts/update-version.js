const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Типы обновления версии
const UPDATE_TYPES = {
  MAJOR: 'major',   // Большие изменения, несовместимые с предыдущей версией
  MINOR: 'minor',   // Новый функционал, обратно совместимый
  PATCH: 'patch'    // Исправления ошибок
};

// Получаем текущую версию
function getCurrentVersion() {
  const versionPath = path.join(process.cwd(), 'version.json');
  const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  return versionData.version;
}

// Обновляем версию
function updateVersion(type) {
  const versionPath = path.join(process.cwd(), 'version.json');
  const packagePath = path.join(process.cwd(), 'package.json');
  
  // Читаем данные версии
  const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const [major, minor, patch] = versionData.version.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case UPDATE_TYPES.MAJOR:
      newVersion = `${major + 1}.0.0`;
      break;
    case UPDATE_TYPES.MINOR:
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case UPDATE_TYPES.PATCH:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      console.error('Неизвестный тип обновления версии');
      process.exit(1);
  }
  
  // Обновляем данные версии
  versionData.version = newVersion;
  versionData.buildDate = new Date().toISOString().split('T')[0];
  
  // Получаем хеш последнего коммита
  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    versionData.commitHash = commitHash;
  } catch (error) {
    console.warn('Не удалось получить хеш коммита:', error.message);
  }
  
  // Обновляем версию в package.json
  packageData.version = newVersion;
  
  // Записываем обновленные данные
  fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
  fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2));
  
  console.log(`Версия обновлена: ${newVersion}`);
  console.log(`Дата сборки: ${versionData.buildDate}`);
  console.log(`Коммит: ${versionData.commitHash}`);
  
  // Создаем Git тег для новой версии
  try {
    execSync(`git tag -a v${newVersion} -m "Release version ${newVersion}"`);
    console.log(`Создан тег Git: v${newVersion}`);
  } catch (error) {
    console.warn('Не удалось создать Git тег:', error.message);
  }
}

// Получаем тип обновления из аргументов командной строки
const updateType = process.argv[2] || UPDATE_TYPES.PATCH;

if (!Object.values(UPDATE_TYPES).includes(updateType)) {
  console.error(`Неверный тип обновления. Используйте: ${Object.values(UPDATE_TYPES).join(', ')}`);
  process.exit(1);
}

updateVersion(updateType); 