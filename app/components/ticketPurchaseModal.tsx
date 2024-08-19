"use client";

import { useEffect } from "react";
import { RiCloseLine } from "react-icons/ri";
import {TicketPurchaseModalProps} from '../../lib/interface';

export default function TicketPurchaseModal({ setIsBuyTicket }: TicketPurchaseModalProps) {
  // Scroll to the top of the page when the modal is displayed
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <>
      {/* Dark background overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-20 z-0"
        onClick={() => setIsBuyTicket(false)}
      />

      {/* Centered modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <div
          className={`w-80 sm:w-96  h-48 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-lg`}
        >
          {/* Modal header */}
          <div className="rounded-t-lg text-left">
            <h5 className="m-0 p-2 text-white font-bold text-lg">
              Ticket Purchase
            </h5>
          </div>
          {/* Close button */}
          <button
            className="absolute top-0 right-0 mt-1 mr-1 bg-white rounded-full p-1 text-gray-800 shadow hover:shadow-md transition-transform transform hover:translate-x-1 hover:translate-y-1"
            onClick={() => setIsBuyTicket(false)}
          >
            <RiCloseLine className="text-xl" />
          </button>

          <div className="text-sm text-white text-left grid gap-2">
            <div className="w-full max-w-screen-lg px-2">
              <div className="text-white  rounded-lg">
                <div className="grid gap-4">
                  <p>
                    Thank you for your ticket purchase
                  </p>
                  <p>
                    You can view your tickets by selecting the "My Tickets" button at the top of the page.
                  </p>
                </div>
              </div>
            </div>
          </div>


          {/* Modal actions */}
          <div className="absolute bottom-2 w-full flex justify-around items-center">
            <button
              className="bg-red-500 text-white font-medium py-2 px-7 rounded-lg text-sm shadow hover:bg-red-600 transition-all transform hover:-translate-y-1"
              onClick={() => setIsBuyTicket(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}