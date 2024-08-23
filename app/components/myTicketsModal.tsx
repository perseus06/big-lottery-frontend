"use client";

import { RiCloseLine } from "react-icons/ri";
import {
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  TableBody,
  Table,
} from "@/components/ui/table";
import { useState } from "react";

import {Ticket, MyTicketsProps} from '../../lib/interface';

export default function MyTickets({ setTicketIsOpen, myTickets }: MyTicketsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 3;

  // Calculate the current tickets to display
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = myTickets.slice(indexOfFirstTicket, indexOfLastTicket);

  // Calculate the total number of pages
  const totalPages = Math.ceil(myTickets.length / ticketsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className={`relative bg-gradient-to-r from-teal-500 to-purple-500 p-8 rounded-lg shadow-lg text-white w-[1/2] mx-auto border`}>
            <h2 className="text-2xl font-bold mb-4">My Tickets</h2>
            <div className="mb-4">
              {/* Modal content with vertical scroll */}
              <div className="p-4 text-sm text-white text-left grid gap-2 max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-1xl font-bold text-white">
                        Raffle #
                      </TableHead>
                      <TableHead className="text-1xl font-bold text-white">
                        Ticket (From Index)
                      </TableHead>
                      <TableHead className="text-1xl font-bold text-white">
                        Ticket (To Index)
                      </TableHead>
                      <TableHead className="text-1xl font-bold text-white">
                        Purchased Tickets
                      </TableHead>
                      <TableHead className="text-1xl font-bold text-white">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTickets.length > 0 ? (
                      currentTickets.map((myTicket, i) => (
                        <TableRow key={i}>
                          <TableCell>{myTicket.raffleId.toLocaleString()}</TableCell>
                          <TableCell>{myTicket.fromIndex.toLocaleString()}</TableCell>
                          <TableCell>{myTicket.toIndex.toLocaleString()}</TableCell>
                          <TableCell>{myTicket.purchasedTickets.toLocaleString()}</TableCell>
                          <TableCell>{myTicket.status}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <></>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex justify-center items-center mt-2">
                <button
                  className="bg-gray-300 text-gray-700 font-medium py-1 px-3 rounded-lg text-sm shadow hover:bg-gray-400 transition-all"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="mx-2 text-white">
                  Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
                </span>
                <button
                  className="bg-gray-300 text-gray-700 font-medium py-1 px-3 rounded-lg text-sm shadow hover:bg-gray-400 transition-all"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
            <button
              className="absolute top-2 right-2 text-white hover:text-gray-200 transition duration-300 text-[24px]"
              onClick={() => setTicketIsOpen(false)}
            >
              &times;
            </button>
          </div>
      </div>
    </>
  );
}