"use client";

import { RiCloseLine } from "react-icons/ri";
import {RaffleDetailsModalProps} from "../../lib/interface";

export default function RaffleDetailsModal({ setIsOpen, liveRaffle }: RaffleDetailsModalProps) {
  let styleType;

  if (liveRaffle.account.raffleId % 3 == 0) {
    styleType = "from-green-400 to-blue-500";
  } else if (liveRaffle.account.raffleId % 3 == 1) {
    styleType = "from-pink-500 to-purple-400";
  } else {
    styleType = "from-blue-500 to-green-400";
  }
  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className={`relative  bg-gradient-to-r from-teal-500 to-purple-500 p-8 rounded-lg shadow-lg text-white max-w-md mx-auto w-[90%] border`}>
          <h2 className="text-2xl font-bold mb-4">Raffle Details</h2>
          <div className="mb-4">
            <div className="grid grid-cols-1 gap-4 mt-2 p-2 flex bg-white bg-opacity-10 rounded-md overflow-hidden overflow-ellipsis break-all">
              <div>
                <span className="font-medium">Raffle Number: </span>
                {Number(liveRaffle.account.raffleId).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Status: </span>
                {Object.keys(liveRaffle.account.status).toString() == "active" ? "Live" : "Processing"}
              </div>
              <div>
                <span className="font-medium">Ticket Price: </span>
                ${liveRaffle.account.ticketPrice.toLocaleString()} USDC
              </div>
              <div>
                <span className="font-medium">Total Tickets: </span>
                {liveRaffle.account.totalTicket.toLocaleString()} 
              </div>
              <div>
                <span className="font-medium">Tickets Sold: </span>
                {liveRaffle.account.purchasedTicket} 
              </div>
              <div>
                  <span className="font-medium">Prize Pool: </span>
                  ${liveRaffle.account.prize.toLocaleString()} USDC
                </div>
                { 
                  liveRaffle.account.autoGenerate == 1 &&
                    <div>
                      <span className="font-medium">Next Raffle Size: </span>
                      ${Math.floor(liveRaffle.account.prize * liveRaffle.account.multiplier).toLocaleString()} USDC
                    </div>
                }
            </div>
          </div>
          <button
            className="absolute top-2 right-2 text-white hover:text-gray-200 transition duration-300 text-[24px]"
            onClick={() => setIsOpen(false)}
          >
            &times;
          </button>
        </div>
      </div>
    </>
);
};
