"use client";

import { RiCloseLine } from "react-icons/ri";
import { Input } from "@/components/ui/input";

import { useState } from "react";

import {WinnerAddressModalProps} from '../../lib/interface';
import { Button } from "@/components/ui/button";

export default function WinnerAddressModal({ setIsWinner, pubkey }: WinnerAddressModalProps) {
  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className={`relative bg-gradient-to-r from-teal-500 to-purple-500 p-8 rounded-lg shadow-lg text-white max-w-md mx-auto w-[90%] border`}>
            <h2 className="text-2xl font-bold mb-4">Winner Address</h2>
            <div className="mb-4">
              <div className="mt-2 p-2 flex bg-white bg-opacity-10 rounded-md overflow-hidden overflow-ellipsis break-all">
                <Input
                  className="flex-1 text-green-500"
                  value={
                    pubkey
                      ? `${pubkey}`
                      : ""
                  }
                  readOnly
                />
                <Button
                  className="mx-2 relative inline-flex items-center justify-center p-2 px-4 py-2 overflow-hidden font-medium text-white transition duration-300 ease-out bg-gradient-to-r from-teal-500 to-purple-500 rounded-full shadow-md group hover:from-blue-500 hover:to-green-400"
                  onClick={() => {
                    if (pubkey) {
                      navigator.clipboard.writeText(
                        `${pubkey}`
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
            <div className="underline text-center">
              <a href={`https://solana.fm/address/${pubkey}/transactions?cluster=devnet-solana`} target="_blank">Go to Explorer</a>
            </div>
            <button
              className="absolute top-2 right-2 text-white hover:text-gray-200 transition duration-300 text-[24px]"
              onClick={() => setIsWinner(false)}
            >
              &times;
            </button>
          </div>
      </div>
    </>
  );
}