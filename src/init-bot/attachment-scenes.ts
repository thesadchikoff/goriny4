import { ActivatePromo } from '@/scenes/activate-code'
import { AddContract } from '@/scenes/add-contract'
import { AddressBookScene } from '@/scenes/address-book'
import { TransferScene } from '@/scenes/base.scene'
import { BuyContract } from '@/scenes/buy-contract'
import { ChangeFee } from '@/scenes/change-fee'
import { ChooseAdminAddress } from '@/scenes/choose-admin-addres'
import { CreatePromo } from '@/scenes/create-promo'
import { ReplenishScene } from '@/scenes/replenish.scene'
import { SelectCurrency } from '@/scenes/select-currency'
import { SendMessage } from '@/scenes/send-message'
import { SupportScene } from '@/scenes/support/support.scene'
import { answerTicketScene } from '@/scenes/support/answer-ticket.scene'
import { replyToSupportScene } from '@/scenes/support/reply-to-support.scene'
import { Scenes } from 'telegraf'
import { WizardContext } from 'telegraf/typings/scenes'

export const attachmentScenes = () => {
	return new Scenes.Stage<WizardContext>([
		SelectCurrency,
		TransferScene,
		ReplenishScene,
		AddContract,
		CreatePromo,
		ActivatePromo,
		BuyContract,
		SendMessage,
		AddressBookScene,
		ChangeFee,
		ChooseAdminAddress,
		SupportScene,
		answerTicketScene,
		replyToSupportScene,
	])
}
