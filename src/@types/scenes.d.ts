import { Scenes } from 'telegraf'
import { WizardSessionData } from 'telegraf/typings/scenes'

export interface ScenesData extends WizardSessionData {
	createContract: {
		currentPaymentMethodId: string
		currentCurrency: string
		pricePerCoin: number
		currentRequisite: any
	}
	actionType: string
	currentCurrency: string
	pricePerCoin: number
	currentRequisite: any
	support?: {
		message?: string
	}
	ticketId?: number
	ticketReply?: {
		ticketId: number
	}
}

export interface AddContractSession extends WizardSessionData {
	createContract: {
		currentPaymentMethodId: string
		currentCurrency: string
		pricePerCoin: number
		currentRequisite: any
	}
	actionType: string
	currentCurrency: string
	pricePerCoin: number
	currentRequisite: any
	ticketReply?: {
		ticketId: number
	}
}

export interface AddContractSceneSession {
	minPrice: number
	maxPrice: number
}

export interface BotContext extends Scenes.WizardContext {
	match: RegExpExecArray | null
	session: ScenesData | AddContractSession
	scene: Scenes.SceneContextScene<BotContext, AddContractSceneSession>
}

export interface AddContractContext extends Scenes.WizardContext {
	session: AddContractSession
	scene: {
		session: AddContractSceneSession
	}
}

