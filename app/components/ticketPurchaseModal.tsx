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
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className={`relative bg-gradient-to-r from-green-400 to-blue-500 p-8 rounded-lg shadow-lg text-white max-w-md mx-auto w-[90%] border`}>
            <h2 className="text-2xl font-bold mb-4">Ticket Purchase</h2>
            <div className="mb-4">
              <p>
                Thank you for your ticket purchase
              </p>
              <p>
                You can view your tickets by selecting the "My Tickets" button at the top of the page.
              </p>
            </div>
            <button
              className="absolute top-2 right-2 text-white hover:text-gray-200 transition duration-300 text-[24px]"
              onClick={() => setIsBuyTicket(false)}
            >
              &times;
            </button>
          </div>
      </div>
    </>
  );
}