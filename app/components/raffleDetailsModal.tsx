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
      {/* Dark background overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-20 z-0"
        onClick={() => setIsOpen(false)}
      />

      {/* Centered modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <div className={`w-64 md:w-80 lg:w-96 h-80 bg-gradient-to-r ${styleType} rounded-lg shadow-lg`}>
          {/* Modal header */}
          <div className="rounded-t-lg">
            <h5 className="m-0 p-2 text-gray-800 font-medium text-lg text-center">Lottery Details</h5>
          </div>
          {/* Close button */}
          <button
            className="absolute top-0 right-0 mt-1 mr-1 bg-white rounded-full p-1 text-gray-800 shadow hover:shadow-md transition-transform transform hover:translate-x-1 hover:translate-y-1"
            onClick={() => setIsOpen(false)}
          >
            <RiCloseLine className="text-xl" />
          </button>

          {/* Modal content */}
          <div className="p-4 text-sm text-gray-800 text-left grid gap-2">
            <div>
              <span className="font-medium">Raffle Number: </span>
              {Number(liveRaffle.account.raffleId).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Status: </span>
              {Object.keys(liveRaffle.account.status).toString() == "active" ? "Live" : "Completed"}
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
                  <span className="font-medium">Next Lottery Size: </span>
                  ${Math.floor(liveRaffle.account.prize * liveRaffle.account.multiplier).toLocaleString()} USDC
                </div>
            }
          </div>

          {/* Modal actions */}
          <div className="absolute bottom-2 w-full flex justify-around items-center">
          <button
              className="bg-red-500 text-white font-medium py-2 px-7 rounded-lg text-sm shadow hover:bg-red-600 transition-all transform hover:-translate-y-1"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
);
};
