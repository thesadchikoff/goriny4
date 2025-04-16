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
	selfContractAction,
	serviceAction,
	successTicketAction,
	supportAction,
	supportPanelAction,
	supportTicketsAction,
	transactionNotifyForAdminAction,
	transferAction,
	transferBtcAction,
	walletAction,
	buyContractAction, 
	sellContractAction, 
	deleteContractAction,
	buyPaymentMethodAction,
	sellPaymentMethodAction,
	deleteContactAddressAction,
	contactAddressAction
} from '@/actions'
import {startCommand} from '@/commands/start.command'
import {bot} from '@/config/bot'
import disputeModule from '@/core/dispute/dispute.module'
import {QueryTriggers} from "@/constants/query-triggers";
import {Stage} from "@/index";
import { editContractDescriptionAction } from '@/actions/contracts/edit-contract-description.action';
import { myCodes } from '../callbacks/my-codes'
import { deleteCode } from '../callbacks/delete-code'

export const attachmentActions = () => {
	// @ts-ignore
	bot.action('wallet', walletAction)
	// @ts-ignore
	bot.action('replenish_btc', replenishAction)
	// @ts-ignore
	bot.action('main_menu', startCommand)
	// @ts-ignore
	bot.action('contacts_note', contactsNoteAction)
	// @ts-ignore
	Stage.action('check-balance', checkBalance)
	// @ts-ignore
	bot.action('open-dispute', disputeModule.startDispute.bind(disputeModule))
	// @ts-ignore
	bot.action('transfer-btc', transferBtcAction)
	// @ts-ignore
	bot.action('confirm', transferAction)
	// @ts-ignore
	bot.action('send-to-admin', transactionNotifyForAdminAction)
	// @ts-ignore
	bot.action('support', supportAction)
	// @ts-ignore
	bot.action('support-panel', supportPanelAction)
	// @ts-ignore
	bot.action('support-tickets', supportTicketsAction)
	// @ts-ignore
	bot.action('admin-address-change', rootWalletAction)
	
	// Регистрируем обработчики для тикетов
	// @ts-ignore
	bot.action(QueryTriggers.FULL_SUPPORT_TICKET_REGEXP(), fullSupportTicketAction)
	// @ts-ignore
	bot.action(QueryTriggers.PINNED_TICKET_REGEXP(), pinnedTicketAction)
	// @ts-ignore
	bot.action(QueryTriggers.ANSWER_TICKET_REGEXP(), answerTicketAction)
	// @ts-ignore
	bot.action(QueryTriggers.REPLY_TICKET_REGEXP(), replyTicketAction)
	// @ts-ignore
	bot.action(QueryTriggers.SUCCESS_TICKET_REGEXP(), successTicketAction)
	// @ts-ignore
	bot.action(QueryTriggers.DECLINE_TICKET_REGEXP(), declineTicketAction)
	// @ts-ignore
	bot.action(QueryTriggers.BACK_TO_TICKET_REGEXP(), backToTicketAction)
	
	// Регистрируем обработчики для контрактов
	// @ts-ignore
	bot.action(QueryTriggers.SELF_CONTRACT_REGEXP(), selfContractAction)
	// @ts-ignore
	bot.action(QueryTriggers.DELETE_CONTRACT_REGEXP(), deleteContractAction)
	// @ts-ignore
	bot.action(QueryTriggers.BUY_CONTRACT_REGEXP(), buyContractAction)
	// @ts-ignore
	bot.action(QueryTriggers.SELL_CONTRACT_REGEXP(), sellContractAction)
	// @ts-ignore
	bot.action(QueryTriggers.BUY_PAYMENT_METHOD_REGEXP(), buyPaymentMethodAction)
	// @ts-ignore
	bot.action(QueryTriggers.SELL_PAYMENT_METHOD_REGEXP(), sellPaymentMethodAction)
	// @ts-ignore
	bot.action(QueryTriggers.DELETE_CONTACT_ADDRESS_REGEXP(), deleteContactAddressAction)
	// @ts-ignore
	bot.action(QueryTriggers.CONTACT_ADDRESS_REGEXP(), contactAddressAction)
	// @ts-ignore
	bot.action(QueryTriggers.EDIT_CONTRACT_DESCRIPTION_REGEXP(), editContractDescriptionAction)
	// @ts-ignore
	bot.action('coins-withdrawal', coinsWithdrawalAction)
	// @ts-ignore
	bot.action(QueryTriggers.ACCEPT_FOR_BUYER_REGEXP(), disputeModule.accessForBuyer)
	// @ts-ignore
	bot.action(QueryTriggers.ACCEPT_FOR_SELLER_REGEXP(), disputeModule.accessForSeller)
	// @ts-ignore
	bot.action(QueryTriggers.ACTIVE_CONTRACT_REGEXP(), activeContractDetailAction)
	// @ts-ignore
	bot.action(QueryTriggers.ACTIVE_CONTRACTS(), activeContractsAction)
	// @ts-ignore
	bot.action('our_service', serviceAction)

	// Регистрируем обработчики для промокодов
	bot.action('my_codes', myCodes)
	bot.action(/^delete_code_(.+)$/, deleteCode)
}
