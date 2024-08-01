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
} from "@/lib/constants";

export default function Main() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { publicKey, connected, sendTransaction } = useWallet();

  const [isConnected, setIsConnected] = useState(false);
  const [ticketQuantity, setTicketQuantity] = useState<number>(0);
  const [program, setProgram] = useState<Program>();
  const [pool, setCurrentpool] = useState<any>(null);
  const [myTitckets, setMyTickets] = useState<any[]>([]);
  const [winnerInfo, setWinnerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

          const [pool, _] = await PublicKey.findProgramAddress(
            [
            Buffer.from(POOL_SEED)
            ],
            program.programId
          );

          const poolData = await program.account.pool.fetch(pool);
          setCurrentpool(poolData);
       
          const allPoolAccount = await program.account.pool.all();

          // set my tickets per raffle
          await handleMyTickets();

          // set winnerInfo 
          await handleWinnerInfo();
        } catch (error) {
          console.log("Error while fetching pool data:", error);
        } finally {
          setLoading(false);
        }
      }
    })();
  }, [wallet]);

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
         const [pool, _] = await PublicKey.findProgramAddress(
            [
            Buffer.from(POOL_SEED)
            ],
            program.programId
          );

          const poolData = await program.account.pool.fetch(pool);
        
          const currentRaffleId = Number(poolData.raffleId);
          if(currentRaffleId > 0) {
            let tickets = [];
            for(let i = 1; i<= Number(poolData.totalBuyers); i++) {
              const buyerIndex = i;
              const [userInfo, _] = await PublicKey.findProgramAddress(
                [
                  Buffer.from("user_info_seed"),
                  new BN(currentRaffleId).toArrayLike(Buffer,'le', 4),
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

  const handleBuyTickets = async (totalTicket: number) => {
    try {
      if (wallet) {
        let provider: Provider;
        try {
          provider = getProvider();
        } catch {
          provider = new AnchorProvider(connection, wallet, {});
          setProvider(provider);
        }
        if(!pool) {
          console.log("please wait until fetch pool data");
          return;
        }

        const program = new Program(IDL as Idl, PROGRAM_ID);
        const raffleId = Number(pool.raffleId);
        const buyerIndex = Number(pool.totalBuyers) + 1;

        const [poolAddress, _poolAddressBump] = await PublicKey.findProgramAddress(
          [
            Buffer.from("pool")
          ],
          program.programId
        );

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
            Buffer.from(POOL_VAULT_SEED)
          ],
          program.programId
        );

        const random = randomnessAccountAddress(
          pool.newRandomAddress.toBuffer()
        );

        // Create a new oracle instance to handle random numbers
        const vrf = new Orao(provider as any);
        const networkState = await vrf.getNetworkState();
        const treasury = networkState.config.treasury;

        const totalPrice = totalTicket * 10 ** DECIMALS;
        const accountFeeSol = Number(pool.accountFee) * totalTicket / Number(pool.totalTicket);

        // Call the buy_tickets function
        const signature = await program.rpc.buyTickets(
          [...pool.newRandomAddress.toBuffer()],
          raffleId,
          buyerIndex,
          totalTicket,
          new BN(totalPrice),
          accountFeeSol,
          {
            accounts: {
              pool:poolAddress,
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

        const poolData = await program.account.pool.fetch(poolAddress);
        setCurrentpool(poolData);
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
                pool &&
                <div className="mt-12 w-full max-w-screen-lg px-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gradient-to-r from-teal-500 to-purple-500 text-white p-8 rounded-lg shadow-xl">
                      <h2 className="text-3xl font-bold mb-6">
                        🎉 Welcome to the World's Biggest Lottery! 🎉
                      </h2>
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div>
                          <span className="font-medium">Raffle Index: </span>
                          {Number(pool.raffleId)}
                        </div>
                        <div>
                          <span className="font-medium">Status: </span>
                          {Object.keys(pool.status).toString() == "active" ? "Live" : "Completed"}
                        </div>
                        <div>
                          <span className="font-medium">Ticket Price: </span>
                          ${pool.ticketPrice} USDC
                        </div>
                        <div>
                          <span className="font-medium">Total Tickets: </span>
                          {pool.totalTicket} 
                        </div>
                        <div>
                          <span className="font-medium">Tickets Sold: </span>
                          {pool.purchasedTicket} 
                        </div>
                        <div>
                          <span className="font-medium">Prize Pool: </span>
                          ${pool.prize} USDC
                        </div>
                        { 
                          pool.autoGenerate == 1 &&
                            <div>
                              <span className="font-medium">Next Lottery Size: </span>
                              ${Math.floor(pool.prize * pool.multiplier) + 1} USDC
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
                              value={ticketQuantity}
                              onChange={(e) =>
                                setTicketQuantity(parseInt(e.target.value))
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
                                setTicketQuantity(ticketQuantity + 5)
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
                                setTicketQuantity(ticketQuantity + 10)
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
                                setTicketQuantity(ticketQuantity + 50)
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
                                setTicketQuantity(ticketQuantity + 100)
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
                          <span>${(ticketQuantity * pool.ticketPrice).toFixed(2)} USDC</span>
                        </div>
                        <Button onClick={() => handleBuyTickets(ticketQuantity)} className="relative inline-flex items-center justify-center w-full px-6 py-3 mt-8 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-lg group hover:bg-pink-500">
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
          <div className="mt-12 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8 text-white">
          {
            winnerInfo!==null?
              <>
                   <Card key={pool.raffleId}  className={`bg-gradient-to-r  text-white shadow-lg hover:shadow-2xl transition-all duration-300`}>
                     <CardHeader>
                       <CardTitle>Lottery ({getTimeFromDate(Number(winnerInfo.startTime))})</CardTitle>
                     </CardHeader>
                     <CardContent>
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <span className="font-medium">Winner:</span>
                           {winnerInfo.buyer.toBase58().slice(0, 5)}...{winnerInfo.buyer.toBase58().slice(-5)}
                         </div>
                         <div>
                           <span className="font-medium">Winning Ticket:</span>
                           {winnerInfo.winnerTicketNumber}
                         </div>
                         <div>
                           <span className="font-medium">Amount Won:</span>
                           ${winnerInfo.winAmount} USDC
                         </div>
                         <div>
                           <span className="font-medium">Timestamp:</span>
                           {getTimeFromDate(Number(winnerInfo.winnerTime))}
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                </>
              :
              <>
                <div></div>
                <div className="flex justify-center items-center">
                  <h2 className="text-xl font-bold mb-4">No Completed Raffle!</h2>
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
