import * as React from "react";
import { useState } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  Program,
  AnchorProvider,
  setProvider,
  getProvider,
  Idl,
  utils,
  BN,
  Provider,
} from "@project-serum/anchor";
import {
  RPC_ENDPOINT,
  ADMIN_ADDRESS,
  PROGRAM_ID,
  POOL_SEED,
  POOL_NATIVE_SEED,
  PAYTOKEN_MINT,
  DECIMALS,
  USER_INFO_SEED,
  POOL_VAULT_SEED,
  GLOBAL_STATE_SEED,
} from "@/lib/constants";

import { cn } from "@/lib/utils";
import IDL from "@/lib/idl/solana_usdc_raffle.json";
import { PublicKey } from "@solana/web3.js";
import MyTicketsModal from "@/app/components/myTicketsModal";
import MyReferralModal from "@/app/components/myReferralModal";
import {Ticket} from '../../lib/interface';
import { StatusOrder } from "../../lib/interface";

// Default styles that can be overridden by your app
require("@solana/wallet-adapter-react-ui/styles.css");

export const CustomWalletButton = () => {
  const { visible, setVisible } = useWalletModal();
  const { publicKey, disconnect, connect } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [ticketIsOpen, setTicketIsOpen] = useState(false);

  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [isReferralOpen, setIsReferralOpen] = useState(false);

  const handleClick = () => {
    if (!publicKey) {
      setVisible(!visible);
    } else {
      setShowModal(true);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowModal(false);
  };

  const copyPublicKey = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
    }
  };

  const showMyTickets = async() => {
    try {
      if (wallet) {
        let provider: Provider;
        try {
          provider = getProvider();
        } catch {
          provider = new AnchorProvider(connection, wallet, {});
          setProvider(provider);
        }

        const program = new Program(IDL as Idl, PROGRAM_ID);
        const [globalState, globalStateBump] = await PublicKey.findProgramAddress(
          [
            Buffer.from(GLOBAL_STATE_SEED)
          ],
          program.programId
        );

        const globalStateData = await program.account.globalState.fetch(globalState);
        const totalRaffles = Number(globalStateData.totalRaffles);
        
        if(totalRaffles > 0) {
          let tickets = [];
          for(let id = 1; id<=totalRaffles; id++) {
            const [pool, _] = await PublicKey.findProgramAddress(
              [
                Buffer.from(POOL_SEED),
                new BN(id).toArrayLike(Buffer,'le',4)
              ],
              program.programId
            );
            const poolData = await program.account.pool.fetch(pool);
            for(let i = 1; i<= Number(poolData.totalBuyers);) {
              const buyerIndex = i;
              const [userInfo, _] = await PublicKey.findProgramAddress(
                [
                  Buffer.from(USER_INFO_SEED),
                  new BN(id).toArrayLike(Buffer,'le', 4),
                  new BN(buyerIndex).toArrayLike(Buffer,'le', 4)
                ],
                program.programId
              );
              const userData = await program.account.userInfo.fetch(userInfo);
              const entries = userData.entries;
              for(let j = 0; j<entries.length; j++) {
                if(entries[j].buyer.toString() ==  wallet.publicKey.toString()) {
                  const fromIndex = Number(entries[j].fromIndex);
                  const toIndex = Number(entries[j].toIndex);
                  const purchasedTickets = Number(entries[j].purchasedTicket);
                  const statusValue = Object.keys(poolData.status).toString() === "processing"? 1 : (Object.keys(poolData.status).toString() === "active"? 2 : 3);

                  tickets.push({
                    "raffleId":Number(poolData.raffleId),
                    "fromIndex": fromIndex,
                    "toIndex": toIndex,
                    "purchasedTickets": purchasedTickets,
                    "status": Object.keys(poolData.status).toString(),
                    "statusValue": statusValue,
                  })
                }
              }
              i += entries.length;
            }
          }

          // Sort tickets by status: Processing, Active, and then Completed
        
          tickets.sort((a, b) => a.statusValue - b.statusValue);
          
          setMyTickets(tickets);
          setTicketIsOpen(true);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  const handleOpenReferralModal = () => {
    setIsReferralOpen(true); // Open the modal
  };


  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "Connect Wallet";

  return (
    <>
      <div className="flex justify-center space-x-4 mt-6">
        {publicKey && <button
          onClick={() => handleOpenReferralModal()}
          className="relative inline-flex items-center justify-center p-8 px-12 py-4 overflow-hidden text-1xl font-medium text-white transition duration-300 ease-out bg-gradient-to-r from-teal-500 to-purple-500 rounded-full shadow-md group"
          title="Show my referral links"
          >
          <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-gradient-to-r from-teal-500 to-purple-500 group-hover:translate-x-0 ease">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path d="M10.59 13.41a1.999 1.999 0 010-2.82l3.18-3.18a1.999 1.999 0 112.82 2.82l-1.77 1.77a.75.75 0 101.06 1.06l1.77-1.77a3.5 3.5 0 00-4.95-4.95l-3.18 3.18a3.5 3.5 0 004.95 4.95l1.77-1.77a.75.75 0 00-1.06-1.06l-1.77 1.77a1.999 1.999 0 01-2.82 0z" />
              <path d="M13.41 10.59a1.999 1.999 0 010 2.82l-3.18 3.18a1.999 1.999 0 11-2.82-2.82l1.77-1.77a.75.75 0 10-1.06-1.06l-1.77 1.77a3.5 3.5 0 104.95 4.95l3.18-3.18a3.5 3.5 0 00-4.95-4.95l-1.77 1.77a.75.75 0 001.06 1.06l1.77-1.77a1.999 1.999 0 012.82 0z" />
            </svg>
          </span>
          <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">
            Referral Link
          </span>
          <span className="relative invisible">Referral Link</span>
        </button>} 
        {publicKey && <button
          className="relative inline-flex items-center justify-center p-8 px-12 py-4 overflow-hidden text-1xl font-medium text-white transition duration-300 ease-out bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-md group hover:from-orange-500 hover:to-yellow-400"
          onClick={showMyTickets}
          title="Show my tickets"
        >
          <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-gradient-to-r from-orange-500 to-yellow-400 group-hover:translate-x-0 ease">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
          >
            <path d="M3 8.25c0-.966.784-1.75 1.75-1.75h14.5A1.75 1.75 0 0121 8.25v1.294c0 .23-.093.451-.258.614l-.579.579a1.75 1.75 0 000 2.426l.579.579c.165.163.258.384.258.614v1.294a1.75 1.75 0 01-1.75 1.75H4.75A1.75 1.75 0 013 15.75v-1.294c0-.23.093-.451.258-.614l.579-.579a1.75 1.75 0 000-2.426l-.579-.579A.875.875 0 013 9.544V8.25zm4.25-.5a.75.75 0 00-.75.75v7a.75.75 0 001.5 0v-7a.75.75 0 00-.75-.75zm3.25.75a.75.75 0 011.5 0v7a.75.75 0 01-1.5 0v-7zm5.25-.75a.75.75 0 00-.75.75v7a.75.75 0 001.5 0v-7a.75.75 0 00-.75-.75z" />
          </svg>
          </span>
          <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">
            My Tickets
          </span>
          <span className="relative invisible">My Tickets</span>
        </button>}
        <button
          className="relative inline-flex items-center justify-center p-8 px-12 py-4 overflow-hidden text-1xl font-medium text-white transition duration-300 ease-out bg-gradient-to-r from-green-400 to-blue-500 rounded-full shadow-md group hover:from-blue-500 hover:to-green-400"
          onClick={handleClick}
          title={publicKey ? "Click to manage wallet" : "Connect Wallet"}
        >
          {truncatedAddress}
        </button>
      </div>
      {isReferralOpen && publicKey &&
          <MyReferralModal  setIsReferralOpen={setIsReferralOpen} pubkey={publicKey?.toBase58()} />
      }
      {ticketIsOpen && <MyTicketsModal  setTicketIsOpen={setTicketIsOpen} myTickets={myTickets} />}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className="relative bg-gradient-to-r from-green-400 to-blue-500 p-8 rounded-lg shadow-lg text-white max-w-md mx-auto w-[90%] border">
            <h2 className="text-2xl font-bold mb-4">Wallet Options</h2>
            <div className="mb-4">
              <span className="font-medium">Connected Address:</span>
              <div className="mt-2 p-2 bg-white bg-opacity-10 rounded-md overflow-hidden overflow-ellipsis break-all">
                {publicKey && publicKey.toBase58()}
              </div>
            </div>
            <div className="flex justify-between">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-300"
                onClick={copyPublicKey}
              >
                Copy Address
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition duration-300"
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </div>
            <button
              className="absolute top-2 right-2 text-white hover:text-gray-200 transition duration-300"
              onClick={() => setShowModal(false)}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
