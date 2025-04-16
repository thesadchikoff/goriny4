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
    SELF_CONTRACT: (contractId: number) => `contract-item-${contractId}`,
    SELF_CONTRACT_REGEXP: () => /^contract-item-(\d+)$/,
    
    // Триггеры для методов оплаты
    BUY_PAYMENT_METHOD: (methodId: number) => `buy_payment_method_${methodId}`,
    BUY_PAYMENT_METHOD_REGEXP: () => /^buy_payment_method_(\d+)$/,
    SELL_PAYMENT_METHOD: (methodId: number) => `sell_payment_method_${methodId}`,
    SELL_PAYMENT_METHOD_REGEXP: () => /^sell_payment_method_(\d+)$/,
    
    // Триггеры для операций с контрактами
    DELETE_CONTRACT: (contractId: number) => `delete-contract-${contractId}`,
    DELETE_CONTRACT_REGEXP: () => /^delete-contract-(\d+)$/,
    BUY_CONTRACT: (contractId: number) => `buy_contract_${contractId}`,
    BUY_CONTRACT_REGEXP: () => /^buy_contract_(\d+)$/,
    SELL_CONTRACT: (contractId: number) => `sell_contract_${contractId}`,
    SELL_CONTRACT_REGEXP: () => /^sell_contract_(\d+)$/,
    PAYMENT_CONTRACT: (contractId: number) => `payment-contract-${contractId}`,
    PAYMENT_CONTRACT_REGEXP: () => /^payment-contract-(\d+)$/,
    PAYMENT_SUCCESSFUL: (buyerId: string) => `payment-successful-${buyerId}`,
    PAYMENT_SUCCESSFUL_REGEXP: () => /^payment-successful-(\d+)$/,
    EDIT_CONTRACT_DESCRIPTION: (contractId: number) => `edit-contract-description-${contractId}`,
    EDIT_CONTRACT_DESCRIPTION_REGEXP: () => /^edit-contract-description-(\d+)$/,
    
    // Триггеры для адресной книги
    CONTACT_ADDRESS: (addressId: number) => `address-contact-${addressId}`,
    CONTACT_ADDRESS_REGEXP: () => /^address-contact-(\d+)$/,
    DELETE_CONTACT_ADDRESS: (addressId: number) => `delete-contact-${addressId}`,
    DELETE_CONTACT_ADDRESS_REGEXP: () => /^delete-contact-(\d+)$/,
    
    // Триггеры для реквизитов
    REQUISITE: (requisiteId: number) => `requisite_${requisiteId}`,
    REQUISITE_REGEXP: () => /^requisite_(\d+)$/,
    DELETE_REQUISITE: (requisiteId: number) => `delete_requisite_${requisiteId}`,
    DELETE_REQUISITE_REGEXP: () => /^delete_requisite_(\d+)$/,
    
    // Триггеры для сообщений
    SEND_MESSAGE_TO: (userId: string) => `send-message-${userId}`,
    SEND_MESSAGE_TO_REGEXP: () => /^send-message-(\d+)$/,
    
    // Триггеры для транзакций
    CANCEL_TRANSACTION: (transactionId: string) => `cancel-transaction-${transactionId}`,
    CANCEL_TRANSACTION_REGEXP: () => /^cancel-transaction-(.+)$/,
    
    // Другие триггеры
    P2P_TRANSFER: () => 'p2p_transfer'
}