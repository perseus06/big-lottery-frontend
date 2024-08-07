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

export default function Main() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { publicKey, connected, sendTransaction } = useWallet();

  const [isConnected, setIsConnected] = useState(false);
  const [ticketQuantity, setTicketQuantity] = useState<number>(0);
  const [program, setProgram] = useState<Program>();
  const [pool, setCurrentpool] = useState<any>(null);
  const [pools, setPools] = useState<any[]>([]);
  const [liveRaffles, setLiveRaffles] = useState<any[]>([]);
  const [completedPools, setCompletedPool] = useState<any[]>([]);
  const [ticketQuantities, setTicketQuantities] = useState<number[]>([]);
  const [myTitckets, setMyTickets] = useState<any[]>([]);
  const [winnerInfo, setWinnerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalRaffles, setTotalRaffles] = useState<number>(0);

  useEffect(() => {
    setIsConnected(connected);
  }, [connected]);

  useEffect(() => {
    (async () => {
      if (wallet) {
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
            [
              Buffer.from(GLOBAL_STATE_SEED)
            ],
            program.programId
          );

          const globalStateData = await program.account.globalState.fetch(globalState);
          const totalRaffles = Number(globalStateData.totalRaffles);
          setTotalRaffles(totalRaffles);

          const [pool, _] = await PublicKey.findProgramAddress(
            [
              Buffer.from(POOL_SEED),
              new BN(totalRaffles).toArrayLike(Buffer,'le',4)
            ],
            program.programId
          );


          const poolData = await program.account.pool.fetch(pool);
          setCurrentpool(poolData);
       
          const allPoolAccount = await program.account.pool.all();

          setPools(allPoolAccount);
          setLiveRaffles(allPoolAccount.filter((item: any) => Object.keys(item.account.status).toString() == "active"));
          setCompletedPool(allPoolAccount.filter((item: any) => Object.keys(item.account.status).toString() == "completed"));
          setTicketQuantities(new Array(allPoolAccount.filter((item: any) => Object.keys(item.account.status).toString() == "active").length + 1).fill(1));

          // set winnerInfo 
          // await handleWinnerInfo();
        } catch (error) {
          console.log("Error while fetching pool data:", error);
        } finally {
          setLoading(false);
        }
      }
    })();
  }, [wallet]);

  useEffect(() => {
    if(wallet && totalRaffles > 0) {
      // set my tickets per raffle
      handleMyTickets();
    }
  }, [wallet, totalRaffles])

  const handleMyTickets = async() => {
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
            console.log("poolData->",poolData);
            for(let i = 1; i<= Number(poolData.totalBuyers); i++) {
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
              if(userData.buyer.toString() ==  wallet.publicKey.toString()) {
                const fromIndex = Number(userData.fromIndex);
                const toIndex = Number(userData.toIndex);
                const purchasedTickets = Number(userData.purchasedTicket)
                tickets.push({
                  "raffleId":Number(poolData.raffleId),
                  "fromIndex": fromIndex,
                  "toIndex": toIndex,
                  "purchasedTickets": purchasedTickets,
                  "status": Object.keys(poolData.status).toString()
                })
              }
              console.log("tickets->",tickets);

            }
          }
        
          setMyTickets(tickets);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  const handleWinnerInfo = async() => {
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
        const [pool, poolBump] = await PublicKey.findProgramAddress(
          [
          Buffer.from(POOL_SEED)
          ],
          program.programId
        );

        const poolData = await program.account.pool.fetch(pool);
        const currentRaffleId = Number(poolData.raffleId);
        const status = Object.keys(poolData.status).toString();
        let winnerRaffleId = 0;

        if(status == "active" || status == "processing") {
          winnerRaffleId = currentRaffleId - 1;
        } else {
          winnerRaffleId = currentRaffleId;
        }
        const winnerIndex = Number(poolData.winnerIndex);
        if(winnerIndex == 0) {
          console.log("there is no winner");
          return;
        }

        const [userInfo, _] = await PublicKey.findProgramAddress(
          [
            Buffer.from(USER_INFO_SEED),
            new BN(winnerRaffleId).toArrayLike(Buffer,'le', 4),
            new BN(winnerIndex).toArrayLike(Buffer,'le', 4)
          ],
          program.programId
        );
        const userData = await program.account.userInfo.fetch(userInfo);
        setWinnerInfo(userData);
      }
    } catch (error) {
      console.log(error);
    }
  }

  const handleBuyTickets = async (totalTicket: number, raffleId: number) => {
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
        const [pool, _] = await PublicKey.findProgramAddress(
          [
            Buffer.from(POOL_SEED),
            new BN(raffleId).toArrayLike(Buffer,'le',4)
          ],
          program.programId
        );
        const poolData = await program.account.pool.fetch(pool);

        const buyerIndex = Number(poolData.totalBuyers) + 1;

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
        
        const adminAta = getAssociatedTokenAddressSync(
          PAYTOKEN_MINT,
          ADMIN_ADDRESS
        );

        const referralAta = getAssociatedTokenAddressSync(
          PAYTOKEN_MINT,
          ADMIN_ADDRESS
        );
        
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
        const signature = await program.rpc.buyTickets(
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
              referral: program.programId,
              buyerAta,
              adminAta,
              poolAta,
              referralAta: program.programId,
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

        console.log("Your transaction signature for buying tickets without referral:", signature);

        const allPoolAccount = await program.account.pool.all();
        setPools(allPoolAccount);
        setLiveRaffles(allPoolAccount.filter((item: any) => Object.keys(item.account.status).toString() == "active"));
        setCompletedPool(allPoolAccount.filter((item: any) => Object.keys(item.account.status).toString() == "completed"));
        await handleMyTickets();
      }
    } catch (error) {
      console.log("Error while buying tickets:", error);
    }
  };

  const pad = (num: string | number) => ("0" + num).slice(-2); // or use padStart
  const getTimeFromDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    let hours = date.getHours(),
      minutes = date.getMinutes(),
      seconds = date.getSeconds();
    return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds)
  }

  return (
    <div
      key="1"
      className="flex flex-col items-center justify-center bg-gradient-to-r from-green-400 to-blue-500 text-white min-h-screen p-4 relative"
    >
      <video
        autoPlay
        loop
        muted
        className="absolute top-0 left-0 w-full h-full object-cover opacity-15 z-0"
      >
        <source src="/gold.mp4" type="video/mp4" />
      </video>
      <div className="relative z-10">
        <header className="flex items-center w-full max-w-screen-xl">
          <div className="flex items-center space-x-2">
            <div className="animate-pulsate">
              <Image
                src="/lottery-logo.png"
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
        {
          loading ?
            <div className="flex justify-center items-center">
              <h2 className="text-xl font-bold mb-4">Loading...</h2>
            </div> :
            <>
              <div className="mt-12 flex justify-center items-center">
                <h1 className="text-[144px] leading-none font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-yellow-500 to-green-500 animate-pulse drop-shadow-lg shadow-white">
                  $69,420.00
                </h1>
              </div>
              {
                liveRaffles.length > 0 &&
                <div className="mt-12 w-full max-w-screen-lg px-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gradient-to-r from-teal-500 to-purple-500 text-white p-8 rounded-lg shadow-xl">
                      <h2 className="text-3xl font-bold mb-6">
                        🎉 Welcome to the World's Biggest Lottery! 🎉
                      </h2>
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div>
                          <span className="font-medium">Raffle Index: </span>
                          {Number(liveRaffles[0].account.raffleId)}
                        </div>
                        <div>
                          <span className="font-medium">Status: </span>
                          {Object.keys(liveRaffles[0].account.status).toString() == "active" ? "Live" : "Completed"}
                        </div>
                        <div>
                          <span className="font-medium">Ticket Price: </span>
                          ${liveRaffles[0].account.ticketPrice} USDC
                        </div>
                        <div>
                          <span className="font-medium">Total Tickets: </span>
                          {liveRaffles[0].account.totalTicket} 
                        </div>
                        <div>
                          <span className="font-medium">Tickets Sold: </span>
                          {liveRaffles[0].account.purchasedTicket} 
                        </div>
                        <div>
                          <span className="font-medium">Prize pool: </span>
                          ${liveRaffles[0].account.prize} USDC
                        </div>
                        { 
                          liveRaffles[0].account.autoGenerate == 1 &&
                            <div>
                              <span className="font-medium">Next Lottery Size: </span>
                              ${Math.floor(liveRaffles[0].account.prize * liveRaffles[0].account.multiplier) + 1} USDC
                            </div>
                        }
                      </div>
                      <p className="text-lg">
                        Don't miss your chance to win big! Buy your tickets now
                        and join the excitement. Every ticket purchased brings you
                        closer to the enormous prize pool.
                      </p>
                    </div>

                    <div className="bg-gradient-to-l from-teal-500 to-purple-500 text-white-500 p-6 rounded-lg">
                      <h2 className="text-2xl font-bold mb-4">Ticket Purchase</h2>
                      <div className="grid gap-4">
                        <div className="grid gap-4">
                          <div>
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
                              className="relative inline-flex items-center justify-center px-4 py-2 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-md group hover:bg-pink-500"
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
                              className="relative inline-flex items-center justify-center px-4 py-2 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-md group hover:bg-pink-500"
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
                              className="relative inline-flex items-center justify-center px-4 py-2 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-md group hover:bg-pink-500"
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
                              className="relative inline-flex items-center justify-center px-4 py-2 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-md group hover:bg-pink-500"
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
                          <span>${(ticketQuantities[0] * pool.ticketPrice).toFixed(2)} USDC</span>
                        </div>
                        <Button onClick={() => handleBuyTickets(ticketQuantities[0], liveRaffles[0].account.raffleId)} className="relative inline-flex items-center justify-center w-full px-6 py-3 mt-8 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-lg group hover:bg-pink-500">
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
                        </Button>
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
                              <Card key={liveRaffle.account.raffleId} className={`bg-gradient-to-r ${styleType} text-white shadow-lg hover:shadow-2xl transition-all duration-300`}>
                                <CardHeader>
                                  <CardTitle>Lottery</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-medium">Raffle Index: </span>
                                      {Number(liveRaffle.account.raffleId)}
                                    </div>
                                    <div>
                                      <span className="font-medium">Status: </span>
                                      {Object.keys(liveRaffle.account.status).toString() == "active" ? "Live" : "Completed"}
                                    </div>
                                    <div>
                                      <span className="font-medium">Ticket Price: </span>
                                      ${liveRaffle.account.ticketPrice} USDC
                                    </div>
                                    <div>
                                      <span className="font-medium">Total Tickets: </span>
                                      {liveRaffle.account.totalTicket} 
                                    </div>
                                    <div>
                                      <span className="font-medium">Tickets Sold: </span>
                                      {liveRaffle.account.purchasedTicket} 
                                    </div>
                                    <div>
                                      <span className="font-medium">Prize Pool: </span>
                                      ${liveRaffle.account.prize} USDC
                                    </div>
                                    { 
                                      liveRaffle.account.autoGenerate == 1 &&
                                        <div>
                                          <span className="font-medium">Next Lottery Size: </span>
                                          ${Math.floor(liveRaffle.account.prize * liveRaffle.account.multiplier)} USDC
                                        </div>
                                    }
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
                                    <Button onClick={() => handleBuyTickets(ticketQuantities[i + 1], liveRaffle.account.raffleId)}
                                      className="relative inline-flex items-center justify-center w-full px-6 py-3 mt-8 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-lg group hover:bg-pink-500"
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
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })  
                        }        
                    </div> :
                    <div className="flex justify-center items-center"><h2 className="text-xl font-bold mb-4">{liveRaffles.length == 1 ? "" : "No live Raffles!"}</h2></div>
                }
              </div>
            </>
        }
        <div className="mt-12 w-full max-w-screen-lg px-4">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Summary</h2>
            <p>
              This is the world's Biggest Lottery! Every time a smaller
              lottery is completed, a larger lottery is created.
              Eventually, we aim to be the World's Largest Raffle Lottery.
            </p>
          </div>
        </div>
        <div className="mt-12 w-full max-w-screen-lg px-4">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Referral</h2>
            <div className="grid gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Input
                    className="flex-1 text-green-500"
                    value={
                      isConnected && publicKey
                        ? `http://localhost:3000?ref=${publicKey.toBase58()}`
                        : ""
                    }
                    readOnly
                  />
                  <Button
                    className="relative inline-flex items-center justify-center p-2 px-4 py-2 overflow-hidden font-medium text-white transition duration-300 ease-out bg-gradient-to-r from-green-400 to-blue-500 rounded-full shadow-md group hover:from-blue-500 hover:to-green-400"
                    onClick={() => {
                      if (isConnected && publicKey) {
                        navigator.clipboard.writeText(
                          `http://localhost:3000?ref=${publicKey.toBase58()}`
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
                5% of ticket purchase
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 w-full max-w-screen-lg px-4">
          <div className="bg-gradient-to-r from-red-500 to-yellow-500 text-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">My Tickets</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-1xl font-bold text-white">
                    Raffle #
                  </TableHead>
                  <TableHead className="text-1xl font-bold text-white">
                    Ticket(From Index)
                  </TableHead>
                  <TableHead className="text-1xl font-bold text-white">
                    Ticket(To Index)
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
                {myTitckets.length>0 ? myTitckets.map((myTicket, i) => {
                  return(
                    <>
                      <TableRow key={i}>
                        <TableCell>{myTicket.raffleId}</TableCell>
                        <TableCell>{myTicket.fromIndex}</TableCell>
                        <TableCell>{myTicket.toIndex}</TableCell>
                        <TableCell>{myTicket.purchasedTickets}</TableCell>
                        <TableCell>{myTicket.status}</TableCell>
                      </TableRow>
                    </>
                  )
                }):<></>}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="mt-12 w-full max-w-screen-lg px-4">
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
                  <Card key={completedPool.account.raffleId}  className={`bg-gradient-to-r ${styleType} text-white shadow-lg hover:shadow-2xl transition-all duration-300`}>
                    <CardHeader>
                      <CardTitle>Lottery ({`${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">Winner:</span>
                          {completedPool.account.winner.toBase58().slice(0, 3)}...{completedPool.account.winner.toBase58().slice(-3)}
                        </div>
                        <div>
                          <span className="font-medium">Winning Ticket:</span>
                          {completedPool.account.winnerTicketNumber}
                        </div>
                        <div>
                          <span className="font-medium">Amount Won:</span>
                          ${completedPool.account.prize} USDC
                        </div>
                        <div>
                          <span className="font-medium">Timestamp:</span>
                          {/* 2023-04-30 23:59:59 */}
                          {dateString}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }) :
              <>
                <div></div>
                <div className="flex justify-center items-center">
                  <h2 className="text-xl font-bold mb-4">No Completed Raffles!</h2>
                </div>
                <div></div>
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
