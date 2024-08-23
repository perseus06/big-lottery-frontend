"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, CustomWalletButton } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  TableBody,
  Table,
} from "@/components/ui/table";
import { CardTitle, CardHeader, CardContent, Card } from "@/components/ui/card";
import Image from "next/image";
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useAnchorWallet,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  clusterApiUrl,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import {
  PhantomWalletAdapter,
  TorusWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import IDL from "@/lib/idl/solana_usdc_raffle.json";
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
  networkStateAccountAddress,
  Orao,
  randomnessAccountAddress,
  RANDOMNESS_ACCOUNT_SEED,
} from "@orao-network/solana-vrf";
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

import RaffleDetailsModal from './components/raffleDetailsModal';
import TicketPurchaseModal from "./components/ticketPurchaseModal";
import WinnerAddressModal from "./components/winnerAddressModal";

import { useSearchParams } from 'next/navigation'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Main() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { publicKey, connected, sendTransaction } = useWallet();

  const [isConnected, setIsConnected] = useState(false);
  const [ticketQuantity, setTicketQuantity] = useState<number>(0);
  const [program, setProgram] = useState<Program>();
  const [pools, setPools] = useState<any[]>([]);
  const [liveRaffles, setLiveRaffles] = useState<any[]>([]);
  const [completedPools, setCompletedPool] = useState<any[]>([]);
  const [ticketQuantities, setTicketQuantities] = useState<number[]>([]);
  const [myTitckets, setMyTickets] = useState<any[]>([]);
  const [winnerInfo, setWinnerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalRaffles, setTotalRaffles] = useState<number>(0);
  const [biggestLottery, setBiggestLottery] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isBuy, setIsBuy] = useState(false);
  const [isBuyTicket, setIsBuyTicket] = useState(false);
  const [selectedRaffle, setSelectedRaffle] = useState(null); // State to track which raffle's modal is open
  const [isWinner, setIsWinner] = useState(false);
  const [winnerAddress, setWinnerAddress] = useState<String>("");

  const searchParams = useSearchParams()
  let referral = searchParams.get('ref');
  if(referral) {
    localStorage.setItem('referral', referral);
  } else {
    referral = localStorage.getItem('referral');
  }

  useEffect(() => {
    setIsConnected(connected);
  }, [connected]);
  

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
  
    const fetchData = async () => {
      console.log("isBuy->", isBuy);
      if (wallet && !isBuy) {
        try {
          setLoading(true);
  
          let provider: Provider;
          try {
            provider = getProvider();
          } catch {
            provider = new AnchorProvider(connection, wallet, {});
            setProvider(provider);
          }
  
          const program = new Program(IDL as Idl, PROGRAM_ID);
          setProgram(program);
  
          const [globalState, globalStateBump] = await PublicKey.findProgramAddress(
            [Buffer.from(GLOBAL_STATE_SEED)],
            program.programId
          );
  
          const globalStateData = await program.account.globalState.fetch(globalState);
          const totalRaffles = Number(globalStateData.totalRaffles);
          setTotalRaffles(totalRaffles);
  
          const allPoolAccount = await program.account.pool.all();
          setPools(allPoolAccount);
  
          let activeRaffles = allPoolAccount.filter((item: any) =>
            ["active", "processing"].includes(Object.keys(item.account.status).toString())
          );
          
          setCompletedPool(
            allPoolAccount.filter((item: any) => Object.keys(item.account.status).toString() === "completed")
          );
  
          setTicketQuantities(
            new Array(
              allPoolAccount.filter((item: any) =>
                ["active", "processing"].includes(Object.keys(item.account.status).toString())
              ).length + 1
            ).fill(1)
          );
  
          // Sort activeRaffles by prize in descending order
          activeRaffles.sort((a: any, b: any) => b.account.prize - a.account.prize);
  
          const biggestPrize = activeRaffles[0]?.account.prize || 0;
          setBiggestLottery(biggestPrize);
  
          // Move the biggest raffle to the beginning of the array
          setLiveRaffles([activeRaffles[0], ...activeRaffles.slice(1)]);
        } catch (error) {
          console.log("Error while fetching pool data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
  
    // Initial fetch
    fetchData();
  
    // Set interval for fetching data every 1 or 2 minutes
    intervalId = setInterval(fetchData, 30 * 1000); // 2 minutes (120,000 ms)
    // Clear the interval when the component is unmounted
    return () => clearInterval(intervalId);
  
  }, [wallet, isBuy]);
 
  const handleOpenModal = (raffle: any) => {
    setSelectedRaffle(raffle);
    setIsOpen(true); // Open the modal
  };

  const handleWinnerModal = (address: String) => {
    setWinnerAddress(address);
    setIsWinner(true);
  }

  const handleBuyTickets = async (totalTicket: number, raffleId: number) => {
    try {
      if (wallet) {
        setIsBuy(true);
        let provider: Provider;
        try {
          provider = getProvider();
        } catch {
          provider = new AnchorProvider(connection, wallet, {});
          setProvider(provider);
        }

        const program = new Program(IDL as Idl, PROGRAM_ID);
        const [pool, _] = await PublicKey.findProgramAddress(
          [
            Buffer.from(POOL_SEED),
            new BN(raffleId).toArrayLike(Buffer,'le',4)
          ],
          program.programId
        );
        const poolData = await program.account.pool.fetch(pool);
        const remainTickets = Number(poolData.totalTicket) - Number(poolData.purchasedTicket);
        if(remainTickets < totalTicket){
          toast.error("Please buy avaiable tickets!");
        }

        let buyerIndex = Number(poolData.totalBuyers) + 1;

        const [poolNativeAccount, _poolNativeAccountbump] = await PublicKey.findProgramAddress(
          [
            Buffer.from(POOL_NATIVE_SEED)
          ],
          program.programId
        );

        const [userInfo, userInfoBump] = await PublicKey.findProgramAddress(
          [
            Buffer.from(USER_INFO_SEED),
            new BN(raffleId).toArrayLike(Buffer,'le',4),
            new BN(buyerIndex).toArrayLike(Buffer,'le',4)
          ],
          program.programId
        );

        const buyerAta = getAssociatedTokenAddressSync(
          PAYTOKEN_MINT,
          wallet?.publicKey,
        );

        const buyerAtaInfo = await provider.connection.getAccountInfo(buyerAta);
        if (!buyerAtaInfo) {
          toast.error("You don't have USDC in your wallet!");
          return;
        } 
        
        const adminAta = getAssociatedTokenAddressSync(
          PAYTOKEN_MINT,
          ADMIN_ADDRESS
        );

        let referralAta = null;

        let transaction = new Transaction();

        if(referral === null) {
          referralAta = getAssociatedTokenAddressSync(
            PAYTOKEN_MINT,
            ADMIN_ADDRESS
          );
        } else {
          referralAta = getAssociatedTokenAddressSync(
            PAYTOKEN_MINT,
            new PublicKey(referral)
          );
          // Check if the associated token account exists
          const referralAtaInfo = await provider.connection.getAccountInfo(referralAta);
          if (!referralAtaInfo) {
        
            transaction.add(
              createAssociatedTokenAccountInstruction(
                  wallet.publicKey,
                  referralAta,
                  new PublicKey(referral),
                  PAYTOKEN_MINT,
                  TOKEN_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
              )
            );
          }
        }
        
        const [poolAta, poolAtaBump] = await PublicKey.findProgramAddress(
          [
            Buffer.from(POOL_VAULT_SEED),
            new BN(raffleId).toArrayLike(Buffer, 'le',4)
          ],
          program.programId
        );

        const random = randomnessAccountAddress(
          poolData.newRandomAddress.toBuffer()
        );

        // Create a new oracle instance to handle random numbers
        const vrf = new Orao(provider as any);
        const networkState = await vrf.getNetworkState();
        const treasury = networkState.config.treasury;

        const totalPrice = totalTicket * 10 ** DECIMALS;
        const accountFeeSol = Number(poolData.accountFee) * totalTicket / Number(poolData.totalTicket);

        // Call the buy_tickets function
        const buyTx = program.instruction.buyTickets(
          [...poolData.newRandomAddress.toBuffer()],
          raffleId,
          buyerIndex,
          totalTicket,
          new BN(totalPrice),
          accountFeeSol,
          {
            accounts: {
              pool,
              poolNativeAccount,
              payTokenMint:PAYTOKEN_MINT,
              buyer: wallet.publicKey,
              userInfo,
              referral: referral!==null ? new PublicKey(referral) : program.programId,
              buyerAta,
              adminAta,
              poolAta,
              referralAta: referral!==null ? referralAta : program.programId,
              treasury,
              random,
              config:networkStateAccountAddress(),
              vrf:vrf.programId,
              tokenProgram: TOKEN_PROGRAM_ID,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId
            },
          }
        );

        transaction.add(buyTx);
        // Set the fee payer to the sender's public key
        transaction.feePayer = wallet.publicKey;;
        // Get the recent blockhash
        const recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
        // Sign the transaction
        transaction.recentBlockhash = recentBlockhash;
        // transaction.partialSign(mint);
        const signedTransaction = await wallet.signTransaction(transaction);

        // Send the signed transaction
        const tx = await connection.sendRawTransaction(signedTransaction.serialize());
        console.log("tx->", tx);

      

        const allPoolAccount = await program.account.pool.all();

        setPools(allPoolAccount);
        let activeRaffles = allPoolAccount.filter(
          (item: any) => ["active", "processing"].includes(Object.keys(item.account.status).toString())
        );
        // setLiveRaffles(activeRaffles);
        
        setCompletedPool(allPoolAccount.filter((item: any) => Object.keys(item.account.status).toString() == "completed"));
        setTicketQuantities(
          new Array(
            allPoolAccount.filter(
              (item: any) => ["active", "processing"].includes(Object.keys(item.account.status).toString())
            ).length + 1
          ).fill(1)
        );
        // Sort activeRaffles by prize in descending order
        activeRaffles.sort((a: any, b: any) => b.account.prize - a.account.prize);

        const biggestPrize = activeRaffles[0]?.account.prize || 0;
        setBiggestLottery(biggestPrize);

        // Move the biggest raffle to the beginning of the array
        setLiveRaffles([activeRaffles[0], ...activeRaffles.slice(1)]);
        // await handleMyTickets();
        setIsBuyTicket(true);
        const userInfoData = await program.account.userInfo.fetch(userInfo);
        console.log("user information after buy tickets ->",userInfoData);
        toast.success("You bought tickets successfully!");
      }
    } catch (error:any) {
      console.log("error->", error);
      if(error.message.includes("ReferralError")) {
        toast.error("Referal should not be buyer!");
      } else if(error.message.includes("User rejected the request")) {
        toast.error("User rejected the request!");
        setIsBuy(false);
      }
    } finally {
      setIsBuy(false);
    }
  };

  return (
    <div
      key="1"
      className="flex flex-col items-center justify-center bg-gradient-to-r from-green-400 to-blue-500 text-white min-h-screen p-4 relative"
    >
      <div className="hidden md:block">
        <video
          autoPlay
          loop
          muted
          preload="none"
          className="absolute top-0 left-0 w-full h-full object-cover opacity-15 z-0"
        >
          <source src="/gold.mp4" type="video/mp4" />
        </video>
      </div>
      <ToastContainer />
      <div className="relative z-10 w-full md:w-auto">
        <header className="md:flex items-center w-full max-w-screen-xl">
          <div className="flex items-center space-x-2">
            <div className="animate-pulsate">
              <Image
                src="/lottery-logo1.png"
                alt="World's Biggest Lottery"
                width={200}
                height={50}
              />
            </div>
          </div>
          <div className="ml-auto">
            <CustomWalletButton />
          </div>
        </header>
        <div className="mt-12 w-full max-w-screen-lg px-4">
          <div className="bg-gradient-to-r from-teal-500 to-purple-500 text-white p-8 rounded-lg shadow-xl text-center mb-6 border">
            <h2 className="text-3xl font-bold mb-6">
              🎉 Welcome to the World's Biggest Raffle! 🎉
            </h2>
            <p className="text-lg">
              This is the world's Biggest Raffle! Every time a smaller raffle is completed, a larger raffle is created.
              Eventually, we aim to be the World's Largest Raffle Raffle.
            </p>
            <p className="text-lg">
              Don't miss your chance to win big! Buy your tickets now
              and join the excitement. Every ticket purchased brings you
              closer to the enormous prize pool.
            </p>
          </div>
        </div>
        {
          loading ?
            <div className="flex justify-center items-center">
              <h2 className="text-xl font-bold mb-4">Loading...</h2>
            </div> :
            <>
              {
                (liveRaffles.length > 0 && liveRaffles[0] !== undefined) &&
                <div className="mt-12 w-full max-w-screen-lg px-4">
                  <div className="grid grid-cols-1">
                    <div className="bg-gradient-to-r from-teal-500 to-purple-500 text-white p-8 rounded-lg shadow-xl border">
                      <div className="mt-6 flex justify-center items-center mb-6">
                        <h4 className="text-[48px] md:text-[64px] leading-none font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-yellow-500 to-green-500 animate-pulse drop-shadow-lg shadow-white">
                          ${biggestLottery.toLocaleString()}
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2 text-center">
                        <div>
                          <span className="font-medium">Raffle Number: </span>
                          {Number(liveRaffles[0].account.raffleId).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Total Tickets: </span>
                          {liveRaffles[0].account.totalTicket.toLocaleString()} 
                        </div>
                        <div>
                          <span className="font-medium">Tickets Sold: </span>
                          {liveRaffles[0].account.purchasedTicket.toLocaleString()} 
                        </div>
                        <div>
                          <span className="font-medium">Prize pool: </span>
                          ${liveRaffles[0].account.prize.toLocaleString()} USDC
                        </div>
                      </div>
                      {/* <div className="bg-gradient-to-l from-teal-500 to-purple-500 text-white-500 p-6 rounded-lg"> */}
                      <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">Ticket Purchase</h2>
                      </div>
                      <div className="grid gap-4">
                        <div className="grid gap-4">
                          <div className="grid gap-4 text-left">
                            <Label htmlFor="ticket-quantity">Tickets</Label>
                            <Input
                              className="w-full text-green-500"
                              value={ticketQuantities[0]}
                              onChange={(e) =>
                                setTicketQuantities(() => ticketQuantities.map((item, i) => {
                                  if (i == 0) {
                                    return parseInt(e.target.value);
                                  }

                                  return item;
                                }))
                              }
                              id="ticket-quantity"
                              max="69"
                              min="1"
                              type="number"
                            />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <Button
                              className="relative inline-flex items-center justify-center px-4 py-2 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-md group hover:bg-pink-500 border"
                              onClick={(e) =>
                                setTicketQuantities(() => ticketQuantities.map((item, i) => {
                                  if (i == 0) {
                                    return item + 5;
                                  }

                                  return item;
                                }))
                              }
                            >
                              <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-pink-500 group-hover:translate-x-0 ease">
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
                                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                                  ></path>
                                </svg>
                              </span>
                              <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">
                                5 Tickets
                              </span>
                              <span className="relative invisible">
                                5 Tickets
                              </span>
                            </Button>

                            <Button
                              className="relative inline-flex items-center justify-center px-4 py-2 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-md group hover:bg-pink-500 border"
                              onClick={() =>
                                setTicketQuantities(() => ticketQuantities.map((item, i) => {
                                  if (i == 0) {
                                    return item + 10;
                                  }

                                  return item;
                                }))
                              }
                            >
                              <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-pink-500 group-hover:translate-x-0 ease">
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
                                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                                  ></path>
                                </svg>
                              </span>
                              <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">
                                10 Tickets
                              </span>
                              <span className="relative invisible">
                                10 Tickets
                              </span>
                            </Button>

                            <Button
                              className="relative inline-flex items-center justify-center px-4 py-2 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-md group hover:bg-pink-500 border"
                              onClick={(e) =>
                                setTicketQuantities(() => ticketQuantities.map((item, i) => {
                                  if (i == 0) {
                                    return item + 50;
                                  }

                                  return item;
                                }))
                              }
                            >
                              <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-pink-500 group-hover:translate-x-0 ease">
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
                                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                                  ></path>
                                </svg>
                              </span>
                              <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">
                                50 Tickets
                              </span>
                              <span className="relative invisible">
                                50 Tickets
                              </span>
                            </Button>

                            <Button
                              className="relative inline-flex items-center justify-center px-4 py-2 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-md group hover:bg-pink-500 border"
                              onClick={() =>
                                setTicketQuantities(() => ticketQuantities.map((item, i) => {
                                  if (i == 0) {
                                    return item + 100;
                                  }

                                  return item;
                                }))
                              }
                            >
                              <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-pink-500 group-hover:translate-x-0 ease">
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
                                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                                  ></path>
                                </svg>
                              </span>
                              <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">
                                100 Tickets
                              </span>
                              <span className="relative invisible">
                                100 Tickets
                              </span>
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <span>Total Cost:</span>
                          <span>${(ticketQuantities[0] * liveRaffles[0].account.ticketPrice).toFixed(2)} USDC</span>
                        </div>
                        <div className="grid  grid-cols-1 md:grid-cols-2 gap-2">
                          {Object.keys(liveRaffles[0].account.status).toString() == "active" ? <Button onClick={() => handleBuyTickets(ticketQuantities[0], liveRaffles[0].account.raffleId)} className="relative inline-flex items-center justify-center w-full px-6 py-3 mt-8 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-lg group hover:bg-pink-500 border">
                            <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-pink-500 group-hover:translate-x-0 ease">
                              <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                                ></path>
                              </svg>
                            </span>
                            <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">
                              Buy Tickets
                            </span>
                            <span className="relative invisible">Buy Tickets</span>
                          </Button>: <Button
                            className="relative inline-flex items-center justify-center w-full px-6 py-3 mt-8 overflow-hidden font-semibold text-black transition duration-300 ease-out bg-slate-300 rounded-full shadow-lg group hover:bg-pink-500 border" disabled={true}
                          >
                            SELECTING WINNER
                          </Button>}
                          <Button
                            onClick={() => handleOpenModal(liveRaffles[0])}
                            className="relative inline-flex items-center justify-center w-full px-6 py-3 mt-8 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-lg group hover:bg-pink-500 border"
                          >
                            Show Details
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                  </div>
                </div>
              }
              <div className="mt-12 w-full max-w-screen-lg px-4">
                { 
                  liveRaffles.length > 1 ?
                    <div className="mt-12 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-white">
                        {
                          liveRaffles.slice(1).map((liveRaffle, i) => {

                            
                            let styleType;

                            if (i % 3 == 0) {
                              styleType = "from-green-400 to-blue-500";
                            } else if (i % 3 == 1) {
                              styleType = "from-pink-500 to-purple-400";
                            } else {
                              styleType = "from-blue-500 to-green-400";
                            }
                            return (
                              <>
                                <Card key={liveRaffle.account.raffleId} className={`bg-gradient-to-r ${styleType} text-white shadow-lg hover:shadow-2xl transition-all duration-300`}>
                                  <CardHeader>
                                    <CardTitle></CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="grid gap-4 mb-2">
                                      <div>
                                        <span className="font-medium">Raffle Number: </span>
                                        {Number(liveRaffle.account.raffleId).toLocaleString()}
                                      </div>
                                      <div>
                                        <span className="font-medium">Total Tickets: </span>
                                        {liveRaffle.account.totalTicket.toLocaleString()} 
                                      </div>
                                      <div>
                                        <span className="font-medium">Tickets Sold: </span>
                                        {liveRaffle.account.purchasedTicket.toLocaleString()} 
                                      </div>
                                      <div>
                                        <span className="font-medium">Prize Pool: </span>
                                        ${liveRaffle.account.prize.toLocaleString()} USDC
                                      </div>
                                    </div>
                                    <div className="grid gap-4">
                                      <div>
                                        <Label htmlFor="ticket-quantity">Tickets</Label>
                                        <Input
                                          className="w-full text-green-500"
                                          value={ticketQuantities[i + 1]}
                                          onChange={(e) =>
                                            setTicketQuantities(() => ticketQuantities.map((item, index) => {
                                              if (i + 1 == index) {
                                                return parseInt(e.target.value)
                                              }
                  
                                              return item;
                                            }))
                                          }
                                          id="ticket-quantity"
                                          max="69"
                                          min="1"
                                          type="number"
                                        />
                                      </div>
                                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <span>Total Cost:</span>
                                        <span>${(ticketQuantities[i + 1] * liveRaffle.account.ticketPrice).toFixed(2)} USDC</span>
                                      </div>
                                      {Object.keys(liveRaffle.account.status).toString() == "active" ? <Button onClick={() => handleBuyTickets(ticketQuantities[i + 1], liveRaffle.account.raffleId)}
                                        className="relative inline-flex items-center justify-center w-full px-6 py-3 mt-8 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-lg group hover:bg-pink-500 border"
                                      >
                                        <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-pink-500 group-hover:translate-x-0 ease">
                                          <svg
                                            className="w-6 h-6"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                                            ></path>
                                          </svg>
                                        </span>
                                        <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">
                                          Buy Tickets
                                        </span>
                                        <span className="relative invisible">
                                          Buy Tickets
                                        </span>
                                      </Button>:<Button
                                        className="relative inline-flex items-center justify-center w-full px-6 py-3 mt-8 overflow-hidden font-semibold text-black transition duration-300 ease-out bg-slate-300 rounded-full shadow-lg group hover:bg-pink-500" disabled={true}
                                      >
                                        SELECTING WINNER
                                      </Button>}
                                      <Button
                                        onClick={() => handleOpenModal(liveRaffle)}
                                        className="relative inline-flex items-center justify-center w-full px-6 py-3 mt-8 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-lg group hover:bg-pink-500 border"
                                      >
                                        Show Details
                                      </Button>
                                    </div>
                                  </CardContent>
                                  {/* Modal Component */}
                                  {isOpen && <RaffleDetailsModal  setIsOpen={setIsOpen} liveRaffle={selectedRaffle} />}
                                </Card>
                              </>
                             
                            );
                          })  
                        }        
                    </div> :
                    <div className="flex justify-center items-center"><h2 className="text-xl font-bold mb-4">{liveRaffles.length == 1 ? "" : "No live Raffles!"}</h2></div>
                }
              </div>
            </>
        }
        {
          isBuyTicket && <TicketPurchaseModal setIsBuyTicket={setIsBuyTicket} />
        }
        <div className="mt-12 w-full max-w-screen-lg px-4">
          {completedPools.length > 0 &&   <div className="flex justify-center items-center">
            <h2 className="text-xl font-bold mb-4">Completed Raffles!</h2>
          </div>}
          <div className="mt-12 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-white">
          {
            completedPools.length > 0 ?
            completedPools.map((completedPool, i) => {
                let styleType;

                if (i % 3 == 0) {
                  styleType = "from-green-400 to-blue-500";
                } else if (i % 3 == 1) {
                  styleType = "from-blue-500 to-purple-500";
                } else {
                  styleType = "from-purple-500 to-pink-500";
                }

                const timestamp = completedPool.account.startTime;
                const date = new Date(timestamp * 1000);

            
                const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
                
                return (
                  <>
                    <Card key={completedPool.account.raffleId}  className={`bg-gradient-to-r ${styleType} text-white shadow-lg hover:shadow-2xl transition-all duration-300`}>
                      <CardHeader>
                        <CardTitle>Raffle ({`${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <span className="font-medium">Raffle Number:</span>
                            {completedPool.account.raffleId.toLocaleString()}
                          </div>
                          <div onClick={() => handleWinnerModal(completedPool.account.winner.toBase58())}>
                            <span className="font-medium">Winner:</span>
                            {completedPool.account.winner.toBase58().slice(0, 3)}...{completedPool.account.winner.toBase58().slice(-3)}
                          </div>
                          <div>
                            <span className="font-medium">Winning Ticket:</span>
                            {completedPool.account.winnerTicketNumber.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Amount Won:</span>
                            ${completedPool.account.prize.toLocaleString()} USDC
                          </div>
                          <div>
                            <span className="font-medium">Timestamp:</span>
                            {dateString}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {isWinner && <WinnerAddressModal setIsWinner = {setIsWinner} pubkey={winnerAddress}/>}
                  </>  
                );
              }) :
              <>
                <div className="flex justify-center items-center">
                  <h2 className="text-xl font-bold mb-4">No Completed Raffles!</h2>
                </div>
              </>  
          }  
          </div>
        </div>
        <style jsx>{`
          @keyframes pulsate {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.2);
            }
            100% {
              transform: scale(1);
            }
          }

          .animate-pulsate {
            animation: pulsate 15s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
