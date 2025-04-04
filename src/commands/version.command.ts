import {Context} from 'telegraf'
import {versionService} from '../service/version.service'

export const versionCommand = async (ctx: Context) => {
  const versionInfo = versionService.getVersionInfo()
  
  await ctx.reply(
    `ℹ️ Информация о версии бота:\n\n` +
    `Версия: ${versionInfo.version}\n` +
    `Сборка: ${versionInfo.buildDate}\n` +
    `Коммит: ${versionInfo.commitHash}\n` +
    `Окружение: ${versionInfo.environment}`,
    {parse_mode: 'HTML'}
  )
} 