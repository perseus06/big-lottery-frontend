"use client";

import { useEffect, useMemo, useState } from "react";
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
  PhantomWalletAdapter,
  TorusWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  transfer,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
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
import { v4 as uuid } from "uuid";
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
  GLOBAL_STATE_SEED
} from "@/lib/constants";
import {
  networkStateAccountAddress,
  Orao,
  randomnessAccountAddress,
  RANDOMNESS_ACCOUNT_SEED,
} from '@orao-network/solana-vrf';
import IDL from "@/lib/idl/solana_usdc_raffle.json";
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

export default function Page() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { sendTransaction } = useWallet();

  const [program, setProgram] = useState<Program>();
  const [ticketValue, setTicketValue] = useState<number>(1);
  const [maxTickets, setMaxTickets] = useState(100);
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [prizeAmount, setPrizeAmount] = useState<number>(69);
  const [autoRecreate, setAutoRecreate] = useState(true);
  const [currentPool, setCurrentPool] = useState<any>(null);
  const [pools, setPools] = useState<any[]>([]);
  const [winner, setWinner] = useState<String>("");
  const [activePoolIndex, setActivePoolIndex] = useState<number>(1);

  const [validationErrors, setValidationErrors] = useState({
    "ticketValue":"",
    "maxTickets":"",
    "prizeAmount":"",
    "multiPlierValue":""
  });

  useEffect(() => {
    (async () => {
      if (wallet) {
        let provider: Provider;
        try {
          provider = getProvider();
        } catch {
          provider = new AnchorProvider(connection, wallet, {});
          setProvider(provider);
        }

        const program = new Program(IDL as Idl, PROGRAM_ID);
        setProgram(program);

        const allPoolAccount = await program.account.pool.all();

        console.log("allPoolAccount:", allPoolAccount);
        setPools(allPoolAccount);
        
        const [globalState, globalStateBump] = await PublicKey.findProgramAddress(
          [
            Buffer.from(GLOBAL_STATE_SEED)
          ],
          program.programId
        );

        const globalStateData = await program.account.globalState.fetch(globalState);
        const raffleId = Number(globalStateData.totalRaffles);

        const [pool, _] = await PublicKey.findProgramAddress(
          [
            Buffer.from(POOL_SEED),
            new BN(raffleId).toArrayLike(Buffer,'le',4)
          ],
          program.programId
        );

        try {
          const poolData = await program.account.pool.fetch(pool);
          setCurrentPool(poolData);
          console.log(poolData);
          if(Object.keys(poolData.status).toString() == "completed") {
            console.log(poolData);
            const winner = poolData.winner.toString();
            setWinner(winner); 
          }
        } catch (error) {
          setCurrentPool(null);
        }
      }
    })();
  }, [wallet]);

  const handleTicketValueChange = (e: any) => {
    const value = parseFloat(e.target.value);
    setTicketValue(isNaN(value) ? 0 : value);
  };

  const handleMaxTicketsChange = (e: any) => {
    const value = parseInt(e.target.value);
    setMaxTickets(isNaN(value) ? 0 : value);
  };

  const handlePrizeAmountChange = (e: any) => {
    const value = parseFloat(e.target.value);
    setPrizeAmount(isNaN(value) ? 0 : value);
  };

  const validateFields = () => {
    const errors = {
      "ticketValue":"",
      "maxTickets":"",
      "prizeAmount":"",
      "multiPlierValue":""
    };
    let errorsCount = 0;

    if (ticketValue <= 0) {
      errors.ticketValue = "Ticket value must be greater than 0";
      errorsCount += 1;
    }

    if (maxTickets <= 0) {
      errors.maxTickets = "Max tickets must be greater than 0";
      errorsCount += 1;
    }

    if (prizeAmount <= 0) {
      errors.prizeAmount = "Prize amount must be greater than 0";
      errorsCount += 1;
    }

    if (multiplier < 1) {
      errors.multiPlierValue = "Prize amount must be greater than 1";
      errorsCount += 1;
    }

    setValidationErrors(errors);
   
    return errorsCount === 0;
  };

  const handleAutoGenerate = async(raffleId: number) => {
    try {
      if(!wallet) {
        console.log("please connect wallet!");
        return
      }

      let provider: Provider;
      try {
        provider = getProvider();
      } catch {
        provider = new AnchorProvider(connection, wallet, {});
        setProvider(provider);
      }
      console.log(raffleId);
      const program = new Program(IDL as Idl, PROGRAM_ID);
      const [pool, _] = await PublicKey.findProgramAddress(
        [
          Buffer.from(POOL_SEED),
          new BN(raffleId).toArrayLike(Buffer,'le',4)
        ],
        program.programId
      );
      let poolData = await program.account.pool.fetch(pool);
      const autoGenerate = Number(poolData.autoGenerate) == 1? 0: 1;
      // please write logic here 
      const signature = await program.rpc.changePoolAutoGenerate(
        raffleId,
        autoGenerate, {
          accounts: {
            admin: wallet.publicKey,
            pool
          }
        }
      );
      console.log("signature->",signature);
      const allPoolAccount = await program.account.pool.all();
      console.log("allPoolAccount:", allPoolAccount);
      setPools(allPoolAccount);
    } catch (error) { 
      console.log(error);
    }
  }

  const handleCreateRaffle = async () => {
    try {
      if (!validateFields() || !wallet) {
        return;
      }

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
      const raffleId = Number(globalStateData.totalRaffles) + 1;

      const [pool, _] = await PublicKey.findProgramAddress(
        [
          Buffer.from(POOL_SEED),
          new BN(raffleId).toArrayLike(Buffer,'le',4)
        ],
        program.programId
      );

      // Display the new RaffleId
      const price = ticketValue; // Number(1); // 1 USDC
      const prize = prizeAmount; //Number(69); // 69 USDC
      const reserved = Number(0.2);
      const autoGenerate = autoRecreate ? Number(1) : Number(0);
      const lotteryMultiplier = multiplier;
      const accountFee = 100000000;

      const [poolNativeAccount, _poolNativeAccountbump] = await PublicKey.findProgramAddress(
        [
          Buffer.from(POOL_NATIVE_SEED)
        ],
        program.programId
      );

      const [poolAta, poolAtaBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from(POOL_VAULT_SEED),
          new BN(raffleId).toArrayLike(Buffer,'le',4)
        ],
        program.programId
      );
      console.log("poolAta->", poolAta.toString());
      console.log("raffleId->",raffleId);

      // Call the create_raffle function
      const signature = await program.rpc.createRaffle(
        raffleId,
        reserved,
        price,
        prize,
        autoGenerate,
        lotteryMultiplier,
        accountFee, {
          accounts: {
            admin: wallet.publicKey,
            globalState,
            pool,
            poolNativeAccount,
            payTokenMint: PAYTOKEN_MINT,
            poolAta,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY
          }
        }
      )

      console.log("Your transaction signature for creating a new raffle", signature);

      const poolData = await program.account.pool.fetch(pool);
      setCurrentPool(poolData);
      console.log("new created poolData:", poolData);
      const allPoolAccount = await program.account.pool.all();

      console.log("allPoolAccount:", allPoolAccount);
      setPools(allPoolAccount);
    } catch (error) {
      console.log("Error while creating a new raffle:", error);
    }
  };


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
      <div className="relative z-10 w-full">
        <header className="md:flex items-center w-full max-w-screen-xl">
          <div className="md:flex items-center space-x-2">
            <div className="animate-pulsate w-fit">
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
        <div className="mt-12 w-full max-w-screen-lg px-4">
          <div className="bg-blue-500 text-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Create Raffle</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticket-value" className="text-white">
                  Ticket Value (USDC)
                </Label>
                <Input
                  id="ticket-value"
                  type="number"
                  value={ticketValue}
                  onChange={(e) =>
                    setTicketValue(parseFloat(e.target.value))
                  }
                  min={0.01}
                  step={0.01}
                  required
                  className="text-black"
                />
                {validationErrors.ticketValue && (
                  <p className="text-red-500 mt-1">
                    {validationErrors.ticketValue}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="max-tickets" className="text-white">
                  Multiplier
                </Label>
                <Input
                  id="max-tickets"
                  type="number"
                  value={multiplier}
                  onChange={(e) =>
                    setMultiplier(parseFloat(e.target.value))
                  }
                  min={1}
                  step = {0.01}
                  required
                  className="text-black"
                />
                {validationErrors.maxTickets && (
                  <p className="text-red-500 mt-1">
                    {validationErrors.multiPlierValue}
                  </p>
                )}
              </div> 
              <div>
                <Label htmlFor="prize-amount" className="text-white">
                  Prize Amount (USDC)
                </Label>
                <Input
                  id="prize-amount"
                  type="number"
                  value={prizeAmount}
                  onChange={(e) =>
                    setPrizeAmount(parseFloat(e.target.value))
                  }
                  min={0.01}
                  step={0.01}
                  required
                  className="text-black"
                />
                {validationErrors.prizeAmount && (
                  <p className="text-red-500 mt-1">
                    {validationErrors.prizeAmount}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="auto-recreate" className="text-white">
                  Auto Recreate{" "}
                </Label>
                <input
                  id="auto-recreate"
                  type="checkbox"
                  checked={autoRecreate}
                  onChange={(e) => setAutoRecreate(e.target.checked)}
                />
              </div>
            </div>
            <Button
              className="mt-6 relative inline-flex items-center justify-center w-full px-6 py-3 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-lg group hover:bg-pink-500"
              onClick={() => handleCreateRaffle()}
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
                Create Raffle
              </span>
              <span className="relative invisible">Create Raffle</span>
            </Button>
          </div>
        </div>
        
        <div className="mt-12 w-full max-w-screen-lg px-2">
          <div className="bg-blue-500 text-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Current Raffle</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-1xl font-bold text-white">
                    ID
                  </TableHead>
                  <TableHead className="text-1xl font-bold text-white">
                    Ticket Value
                  </TableHead>
                  <TableHead className="text-1xl font-bold text-white">
                    Max Tickets
                  </TableHead>
                  <TableHead className="text-1xl font-bold text-white">
                    Prize Amount
                  </TableHead>
                  <TableHead className="text-1xl font-bold text-white">
                    Auto Recreate
                  </TableHead>
                  <TableHead className="text-1xl font-bold text-white">
                    Status
                  </TableHead>
                  <TableHead className="text-1xl font-bold text-white">
                    Tickets Sold
                  </TableHead>
                  <TableHead className="text-1xl font-bold text-white">
                    Total Value
                  </TableHead>
                  <TableHead className="text-1xl font-bold text-white">
                    Auto Create
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
               {pools.length !=0 && pools.map((pool) => (
                  <TableRow key={pool.account.raffleId}>
                    <TableCell>{pool.account.raffleId}</TableCell>
                    <TableCell>
                      {pool.account.ticketPrice} USDC
                    </TableCell>
                    <TableCell>
                      {pool.account.totalTicket}
                    </TableCell>
                    <TableCell>
                      {pool.account.prize} USDC
                      </TableCell>
                    <TableCell>
                      {pool.account.autoGenerate == 1 ? "Yes" : "No"}
                    </TableCell>
                    <TableCell>
                      {Object.keys(pool.account.status)}
                    </TableCell>
                    <TableCell>
                      {pool.account.purchasedTicket}
                    </TableCell>
                    <TableCell>
                      {pool.account.totalTicket *
                        pool.account.ticketPrice}{" "}
                      USDC
                    </TableCell>
                    <TableCell>
                      <Button
                        className="relative inline-flex items-center justify-center w-full px-6 py-3 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-lg group hover:bg-pink-500"
                        onClick={() => handleAutoGenerate(pool.account.raffleId)}
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
                          {
                          pool.account.autoGenerate == 1?`Turn off`:`Turn on`
                          }
                        </span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
