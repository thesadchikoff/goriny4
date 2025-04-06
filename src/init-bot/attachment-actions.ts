import {
	activeContractDetailAction,
	activeContractsAction,
	answerTicketAction,
	backToTicketAction,
	checkBalance,
	coinsWithdrawalAction,
	contactsNoteAction,
	declineTicketAction,
	fullSupportTicketAction,
	pinnedTicketAction,
	replenishAction,
	replyTicketAction,
	rootWalletAction,
	serviceAction,
	successTicketAction,
	supportAction,
	supportPanelAction,
	supportTicketsAction,
	transactionNotifyForAdminAction,
	transferAction,
	transferBtcAction,
	walletAction,
} from '@/actions'
import {startCommand} from '@/commands/start.command'
import {bot} from '@/config/bot'
import disputeModule from '@/core/dispute/dispute.module'
import {QueryTriggers} from "@/constants/query-triggers";
import {Stage} from "@/index";

export const attachmentActions = () => {
	bot.action('wallet', walletAction)
	bot.action('replenish_btc', replenishAction)
	bot.action('main_menu', startCommand)
	bot.action('contacts_note', contactsNoteAction)
	Stage.action('check-balance', checkBalance)
	bot.action('open-dispute', disputeModule.startDispute.bind(disputeModule))
	bot.action('transfer-btc', transferBtcAction)
	bot.action('confirm', transferAction)
	bot.action('send-to-admin', transactionNotifyForAdminAction)
	bot.action('support', supportAction)
	bot.action('support-panel', supportPanelAction)
	bot.action('support-tickets', supportTicketsAction)
	bot.action('admin-address-change', rootWalletAction)
	
	// Регистрируем обработчики для тикетов
	bot.action(QueryTriggers.FULL_SUPPORT_TICKET_REGEXP(), fullSupportTicketAction)
	bot.action(QueryTriggers.PINNED_TICKET_REGEXP(), pinnedTicketAction)
	bot.action(QueryTriggers.ANSWER_TICKET_REGEXP(), answerTicketAction)
	bot.action(QueryTriggers.REPLY_TICKET_REGEXP(), replyTicketAction)
	bot.action(QueryTriggers.SUCCESS_TICKET_REGEXP(), successTicketAction)
	bot.action(QueryTriggers.DECLINE_TICKET_REGEXP(), declineTicketAction)
	bot.action(QueryTriggers.BACK_TO_TICKET_REGEXP(), backToTicketAction)
	
	bot.action('coins-withdrawal', coinsWithdrawalAction)
	bot.action(QueryTriggers.ACCEPT_FOR_BUYER_REGEXP(), disputeModule.accessForBuyer)
	bot.action(QueryTriggers.ACCEPT_FOR_SELLER_REGEXP(), disputeModule.accessForSeller)
	bot.action(QueryTriggers.ACTIVE_CONTRACT_REGEXP(), activeContractDetailAction)
	bot.action(QueryTriggers.ACTIVE_CONTRACTS(), activeContractsAction)
	bot.action('our_service', serviceAction)
}
