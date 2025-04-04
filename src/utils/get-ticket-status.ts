type TicketStatus = 'PENDING' | 'REVIEW' | 'SUCCESS' | 'DECLINE'

const enum TicketStates {
	PENDING = 'В ожидании',
	REVIEW = 'На рассмотрении',
	SUCCESS = 'Исполнен',
	DECLINE = 'Отклонен',
}

const enum TicketStateColor {
	PENDING = '🟡',
	REVIEW = '🔵',
	SUCCESS = '🟢',
	DECLINE = '🔴',
}

const getTicketStatus = (status: TicketStatus) => {
	switch (status) {
		case 'PENDING':
			return TicketStates.PENDING
		case 'REVIEW':
			return TicketStates.REVIEW
		case 'SUCCESS':
			return TicketStates.SUCCESS
		case 'DECLINE':
			return TicketStates.DECLINE
	}
}

const getStatusColor = (status: TicketStatus) => {
	switch (status) {
		case 'PENDING':
			return TicketStateColor.PENDING
		case 'REVIEW':
			return TicketStateColor.REVIEW
		case 'SUCCESS':
			return TicketStateColor.SUCCESS
		case 'DECLINE':
			return TicketStateColor.DECLINE
	}
}

export { getStatusColor, getTicketStatus }
