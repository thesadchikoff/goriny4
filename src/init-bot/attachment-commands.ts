import {actCommand} from '@/commands/act.command'
import {getUserInfo} from '@/commands/get-user'
import {getLogsCommand, getLogsGroupCommand} from '@/commands/get-logs.command'
import {bot} from '@/config/bot'
import {versionCommand} from '@/commands/version.command'
import {walletInfo} from '@/commands/wallet'

export const attachmentCommands = () => {
	bot.command(new RegExp(`^/(.+)$`), getUserInfo)
	bot.command('act', actCommand)
	bot.command('getlogs', getLogsCommand)
	bot.command('getlogsgroup', getLogsGroupCommand)
	// Регистрируем команду версии
	bot.command('version', versionCommand)
	// Регистрируем команду для просмотра кошелька
	walletInfo()

	// Дополнительные логи для диагностики
	bot.on('text', getUserInfo)
}
