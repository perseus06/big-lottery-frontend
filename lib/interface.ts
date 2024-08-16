export interface Ticket{
    raffleId: number,
    fromIndex: number,
    toIndex: number,
    purchasedTickets: number,
    status: String
}
  
export interface MyTicketsProps {
    setTicketIsOpen: (ticketIsOpen: boolean) => void;  // Define the type of setTicketIsOpen
    myTickets: Ticket[];  // Replace 'any' with the appropriate type of your tickets
}


export interface RaffleDetailsModalProps {
    setIsOpen: (isOpen: boolean) => void;  // Define the type of setIsOpen
    liveRaffle: any;  // Replace 'any' with the appropriate type for liveRaffle
}
