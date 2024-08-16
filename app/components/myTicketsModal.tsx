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
      {/* Dark background overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-20 z-0"
        onClick={() => setTicketIsOpen(false)}
      />

      {/* Centered modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <div
          className={`w-80 md:w-full h-96 bg-gradient-to-r from-red-500 to-yellow-500 rounded-lg shadow-lg`}
        >
          {/* Modal header */}
          <div className="rounded-t-lg text-left">
            <h5 className="m-0 p-2 text-gray-800 font-bold text-lg">
              My Tickets
            </h5>
          </div>
          {/* Close button */}
          <button
            className="absolute top-0 right-0 mt-1 mr-1 bg-white rounded-full p-1 text-gray-800 shadow hover:shadow-md transition-transform transform hover:translate-x-1 hover:translate-y-1"
            onClick={() => setTicketIsOpen(false)}
          >
            <RiCloseLine className="text-xl" />
          </button>

          {/* Modal content with vertical scroll */}
          <div className="p-4 text-sm text-gray-800 text-left grid gap-2 max-h-64">
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
                      <TableCell>{myTicket.raffleId}</TableCell>
                      <TableCell>{myTicket.fromIndex}</TableCell>
                      <TableCell>{myTicket.toIndex}</TableCell>
                      <TableCell>{myTicket.purchasedTickets}</TableCell>
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
            <span className="mx-2 text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="bg-gray-300 text-gray-700 font-medium py-1 px-3 rounded-lg text-sm shadow hover:bg-gray-400 transition-all"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>

          {/* Modal actions */}
          <div className="absolute bottom-2 w-full flex justify-around items-center">
            <button
              className="bg-red-500 text-white font-medium py-2 px-7 rounded-lg text-sm shadow hover:bg-red-600 transition-all transform hover:-translate-y-1"
              onClick={() => setTicketIsOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
