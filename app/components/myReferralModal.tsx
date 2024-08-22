"use client";

import { RiCloseLine } from "react-icons/ri";
import { Input } from "@/components/ui/input";

import { useState } from "react";

import {MyReferralModalProps} from '../../lib/interface';
import { Button } from "@/components/ui/button";

export default function MyReferralModal({ setIsReferralOpen, pubkey }: MyReferralModalProps) {
  return (
    <>
      {/* Dark background overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-20 z-0"
        onClick={() => setIsReferralOpen(false)}
      />

      {/* Centered modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <div
          className={`w-80 sm:w-96 md:w-full h-48 md:h-48 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-lg`}
        >
          {/* Modal header */}
          <div className="rounded-t-lg text-left">
            <h5 className="m-0 p-2 text-white font-bold text-lg">
              My Referral Link
            </h5>
          </div>
          {/* Close button */}
          <button
            className="absolute top-0 right-0 mt-1 mr-1 bg-white rounded-full p-1 text-gray-800 shadow hover:shadow-md transition-transform transform hover:translate-x-1 hover:translate-y-1"
            onClick={() => setIsReferralOpen(false)}
          >
            <RiCloseLine className="text-xl" />
          </button>

          <div className="text-sm text-white text-left grid gap-2">
            <div className="w-full max-w-screen-lg px-2">
              <div className="text-white  rounded-lg">
                <div className="grid gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Input
                        className="flex-1 text-green-500"
                        value={
                          pubkey
                            ? `https://big-lottery.vercel.app/?ref=${pubkey}`
                            : ""
                        }
                        readOnly
                      />
                      <Button
                        className="relative inline-flex items-center justify-center p-2 px-4 py-2 overflow-hidden font-medium text-white transition duration-300 ease-out bg-gradient-to-r from-green-400 to-blue-500 rounded-full shadow-md group hover:from-blue-500 hover:to-green-400"
                        onClick={() => {
                          if (pubkey) {
                            navigator.clipboard.writeText(
                              `https://big-lottery.vercel.app/?ref=${pubkey}`
                            );
                          }
                        }}
                      >
                        <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-gradient-to-r from-blue-500 to-green-400 group-hover:translate-x-0 ease">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                            ></path>
                          </svg>
                        </span>
                        <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">
                          Copy
                        </span>
                        <span className="relative invisible">Copy</span>
                      </Button>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Referral Bonus: </span>
                    You gain 5% on each ticket purchase.
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Modal actions */}
          <div className="absolute bottom-2 w-full flex justify-around items-center">
            <button
              className="bg-red-500 text-white font-medium py-2 px-7 rounded-lg text-sm shadow hover:bg-red-600 transition-all transform hover:-translate-y-1"
              onClick={() => setIsReferralOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}