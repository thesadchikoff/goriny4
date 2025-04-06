export const QueryTriggers = {
    // Триггеры для тикетов
    FULL_SUPPORT_TICKET: (ticketId: number) => `full-support-ticket-${ticketId}`,
    FULL_SUPPORT_TICKET_REGEXP: () => /^full-support-ticket-(\d+)$/,
    PINNED_TICKET: (ticketId: number) => `pinned-ticket-${ticketId}`,
    PINNED_TICKET_REGEXP: () => /^pinned-ticket-(\d+)$/,
    DECLINE_TICKET: (ticketId: number) => `decline-ticket-${ticketId}`,
    DECLINE_TICKET_REGEXP: () => /^decline-ticket-(\d+)$/,
    ANSWER_TICKET: (ticketId: number) => `answer-ticket-${ticketId}`,
    ANSWER_TICKET_REGEXP: () => /^answer-ticket-(\d+)$/,
    REPLY_TICKET: (ticketId: number) => `reply-ticket-${ticketId}`,
    REPLY_TICKET_REGEXP: () => /^reply-ticket-(\d+)$/,
    SUCCESS_TICKET: (ticketId: number) => `success-ticket-${ticketId}`,
    SUCCESS_TICKET_REGEXP: () => /^success-ticket-(\d+)$/,
    BACK_TO_TICKET: (ticketId: number) => `back-to-ticket-${ticketId}`,
    BACK_TO_TICKET_REGEXP: () => /^back-to-ticket-(\d+)$/,
    
    // Триггеры для контрактов
    ACCEPT_FOR_BUYER: (contractId: number) => `access-to-buyer-${contractId}`,
    ACCEPT_FOR_BUYER_REGEXP: () => /^access-to-buyer-(\d+)$/,
    ACCEPT_FOR_SELLER: (contractId: number) => `access-to-seller-${contractId}`,
    ACCEPT_FOR_SELLER_REGEXP: () => /^access-to-seller-(\d+)$/,
    ACTIVE_CONTRACTS: () => 'active-contracts',
    ACTIVE_CONTRACT_REGEXP: () => /^active-contract-([\w-]+)$/,
    P2P_TRANSFER: () => 'p2p_transfer'
}