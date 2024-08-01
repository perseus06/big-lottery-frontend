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

  const [program, setProgram] = useState<Program>();
  const [ticketValue, setTicketValue] = useState<number>(1);
  const [maxTickets, setMaxTickets] = useState(100);
  const [prizeAmount, setPrizeAmount] = useState<number>(69);
  const [autoRecreate, setAutoRecreate] = useState(true);
  const [currentPool, setCurrentPool] = useState<any>(null);
  const [winner, setWinner] = useState<String>("");

  const [validationErrors, setValidationErrors] = useState({
    "ticketValue":"",
    "maxTickets":"",
    "prizeAmount":""
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

        const [pool, _] = await PublicKey.findProgramAddress(
          [
          Buffer.from(POOL_SEED)
          ],
          program.programId
        );

        try {
          const poolData = await program.account.pool.fetch(pool);
          setCurrentPool(poolData);
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
      "prizeAmount":""
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

    setValidationErrors(errors);
   
    return errorsCount === 0;
  };

  const handleAutoGenerate = async() => {
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
      const program = new Program(IDL as Idl, PROGRAM_ID);
      const [pool, _] = await PublicKey.findProgramAddress(
        [
        Buffer.from(POOL_SEED)
        ],
        program.programId
      );
      let poolData = await program.account.pool.fetch(pool);
      const autoGenerate = Number(poolData.autoGenerate) == 1? 0: 1;
      // please write logic here 
      const signature = await program.rpc.changePoolAutoGenerate(
        autoGenerate, {
          accounts: {
            admin: wallet.publicKey,
            pool
          }
        }
      );
      console.log("signature->",signature);
      poolData = await program.account.pool.fetch(pool);
      setCurrentPool(poolData);
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

      const [pool, _] = await PublicKey.findProgramAddress(
        [
          Buffer.from(POOL_SEED)
        ],
        program.programId
      );

      let poolData: any;
      try {
        poolData = await program.account.pool.fetch(pool);
      } catch (error) {
        poolData = null;
      }

      // Define the parameters for the create_raffle function //
      // Create a new uuid to use as a new raffle id
      const raffleId = poolData !== null?Number(poolData.raffleId) + 1 : 1;

      // Display the new RaffleId
      const startTime = Math.floor(Date.now() / 1000); // Current timestamp
      const price = ticketValue; // Number(1); // 1 USDC
      const prize = prizeAmount; //Number(69); // 69 USDC
      const reserved = Number(0.2);
      const autoGenerate = autoRecreate ? Number(1) : Number(0);
      const multiplier = Number(1.3);
      const accountFee = 100000000;

      const [poolNativeAccount, _poolNativeAccountbump] = await PublicKey.findProgramAddress(
        [
          Buffer.from(POOL_NATIVE_SEED)
        ],
        program.programId
      );

      let poolAddress = pool;

      let poolNativeAddress = poolNativeAccount;

      const [poolAta, poolAtaBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from(POOL_VAULT_SEED)
        ],
        program.programId
      );

      // Call the create_raffle function
      const signature = await program.rpc.createRaffle(
        raffleId,
        reserved,
        price,
        prize,
        autoGenerate,
        multiplier,
        accountFee, {
          accounts: {
            admin: wallet.publicKey,
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

      poolData = await program.account.pool.fetch(pool);
      setCurrentPool(poolData);
    } catch (error) {
      console.log("Error while creating a new raffle:", error);
    }
  };

  const handleSetWinner = async() => {
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
      const program = new Program(IDL as Idl, PROGRAM_ID);
      const [pool, _] = await PublicKey.findProgramAddress(
        [
        Buffer.from(POOL_SEED)
        ],
        program.programId
      );
      let poolData = await program.account.pool.fetch(pool);
      const raffleId = Number(poolData.raffleId);
      const vrf = new Orao(provider as any);

      const random = randomnessAccountAddress(
        poolData.newRandomAddress.toBuffer()
      );

      let randomnessFulfilled = await vrf.waitFulfilled(
        poolData.newRandomAddress.toBuffer()
      );

      let result,winnerIndex,winnerInfo, winnerInfoData: any;
      console.log("randomnessFulfilled->",randomnessFulfilled);
      if (randomnessFulfilled.randomness) {
        // Extract the random number
        let randomness = randomnessFulfilled.randomness;
        let value = randomness.slice(0, 8); // First 8 bytes (size of u64)
        // Create a DataView from the extracted bytes
        const dataView = new DataView(new ArrayBuffer(8));
      
        // Copy the bytes into the ArrayBuffer
        for (let i = 0; i < 8; i++) {
            dataView.setUint8(i, value[i]);
        }

        // Read the value as a 64-bit little-endian unsigned integer
        // Note: JavaScript's Number type is a 64-bit floating point, so we use BigInt for large integers
        const low = BigInt(dataView.getUint32(0, true));
        const high = BigInt(dataView.getUint32(4, true));
        result = (high << 32n) | low;
      } else {
        console.log('Randomness request not fulfilled');
      }

      if(result == undefined) {
        return;
      }

      result = result % BigInt(poolData.purchasedTicket);
      while(true) {
        for(let i = 1; i<= Number(poolData.totalBuyers); i++) {
          const buyerIndex = i;

          const [userInfo, _] = await PublicKey.findProgramAddress(
            [
              Buffer.from("user_info_seed"),
              new BN(raffleId).toArrayLike(Buffer,'le', 4),
              new BN(buyerIndex).toArrayLike(Buffer,'le', 4)
            ],
            program.programId
          );
          const userData = await program.account.userInfo.fetch(userInfo);
          const fromIndex = Number(userData.fromIndex);
          const toIndex = Number(userData.toIndex);
          if(fromIndex < result && result < toIndex) {
            winnerIndex = i;
            winnerInfoData = userData;
            winnerInfo = userInfo;
            break;
          }
        }
        break;
      }

      if(winnerInfo==undefined) {
        return
      }
     
      const tx = await program.rpc.setWinner(
        [...poolData.newRandomAddress.toBuffer()], 
        raffleId, 
        winnerIndex, {
          accounts: {
            pool,
            signer: wallet.publicKey,
            winner: winnerInfoData.buyer,
            winnerInfo,
            random,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId
          }
        }
      );
      console.log('Your transaction signature for setting winner:', tx);
      poolData = await program.account.pool.fetch(pool);
      setCurrentPool(poolData);
      setWinner(winnerInfoData.buyer.toString());
    } catch (error) { 
      console.log(error);
    }
  }

  const handleClaimPrize = async() => {
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
      const program = new Program(IDL as Idl, PROGRAM_ID);
      const [pool, _poolBump] = await PublicKey.findProgramAddress(
        [
        Buffer.from(POOL_SEED)
        ],
        program.programId
      );

      const [poolNativeAccount,_2] = await PublicKey.findProgramAddress(
        [
          Buffer.from("pool_native")
        ],
        program.programId
      );

      let poolData = await program.account.pool.fetch(pool);
      
      const raffleId = Number(poolData.raffleId);
      const winnerIndex = Number(poolData.winnerIndex);
      const winner = poolData.winner;

      const [userInfo, _] = await PublicKey.findProgramAddress(
        [
          Buffer.from(USER_INFO_SEED),
          new BN(raffleId).toArrayLike(Buffer,'le', 4),
          new BN(winnerIndex).toArrayLike(Buffer,'le', 4)
        ],
        program.programId
      );

      const winnerAta = await getAssociatedTokenAddress(
        PAYTOKEN_MINT,
        winner
      );

      const adminAta = await getAssociatedTokenAddress(
        PAYTOKEN_MINT,
        wallet.publicKey
      );

      const [poolAta, poolAtaBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from(POOL_VAULT_SEED)
        ],
        program.programId
      );

      const signature = await program.rpc.claimPrize(
        raffleId,
        winnerIndex,{
          accounts: {
            pool,
            poolNativeAccount,
            payTokenMint: PAYTOKEN_MINT,
            signer: wallet.publicKey,
            userInfo,
            admin: wallet.publicKey,
            winner: winner,
            winnerAta,
            adminAta,
            poolAta,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId
          }
        }
      )
      console.log("signature->",signature);
      poolData = await program.account.pool.fetch(pool);
      setCurrentPool(poolData);
    } catch (error) { 
      console.log(error);
    }
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
              {/* <div>
                <Label htmlFor="max-tickets" className="text-white">
                  Max Tickets
                </Label>
                <Input
                  id="max-tickets"
                  type="number"
                  value={maxTickets}
                  onChange={(e) =>
                    setMaxTickets(parseInt(e.target.value))
                  }
                  min={1}
                  required
                  className="text-black"
                />
                {validationErrors.maxTickets && (
                  <p className="text-red-500 mt-1">
                    {validationErrors.maxTickets}
                  </p>
                )}
              </div> */}
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
        {currentPool!==null && 
          <div className="mt-12 w-full max-w-screen-lg px-4">
            <div className="bg-blue-500 text-white p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Auto Recreate</h2>
                <Button
                  className="mt-6 relative inline-flex items-center justify-center w-full px-6 py-3 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-lg group hover:bg-pink-500"
                  onClick={() => handleAutoGenerate()}
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
                    currentPool.autoGenerate == 1?`Turn off auto recreate`:`Turn on auto recreate`
                    }
                  </span>
                  <span className="relative invisible">{currentPool!==null && (
                      currentPool.autoGenerate == 1?`Turn off auto recreate`:`Turn on auto recreate`
                    )}</span>
                </Button>
            </div>
          </div>
        }

        {currentPool!==null && 
          <div className="mt-12 w-full max-w-screen-lg px-4">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  { currentPool !== null &&
                    <TableRow key={currentPool.raffleId}>
                      <TableCell>{currentPool.raffleId}</TableCell>
                      <TableCell>
                        {currentPool.ticketPrice} USDC
                      </TableCell>
                      <TableCell>{currentPool.totalTicket}</TableCell>
                      <TableCell>{currentPool.prize} USDC</TableCell>
                      <TableCell>
                        {currentPool.autoGenerate == 1 ? "Yes" : "No"}
                      </TableCell>
                      <TableCell>
                        {Object.keys(currentPool.status)}
                      </TableCell>
                      <TableCell>
                        {currentPool.purchasedTicket}
                      </TableCell>
                      <TableCell>
                        {currentPool.totalTicket *
                          currentPool.ticketPrice}{" "}
                        USDC
                      </TableCell>
                    </TableRow>
                  }
                </TableBody>
              </Table>
              <Button
                className="mt-6 relative inline-flex items-center justify-center w-full px-6 py-3 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-lg group hover:bg-pink-500"
                onClick={() => handleSetWinner()}
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
                  Set Winner
                </span>
              </Button>
              {
              winner!==""&&
              <>
                <span>Winner Address: {winner}</span>
              </>
              }
              <Button
                className="mt-6 relative inline-flex items-center justify-center w-full px-6 py-3 overflow-hidden font-semibold text-white transition duration-300 ease-out bg-green-500 rounded-full shadow-lg group hover:bg-pink-500"
                onClick={() => handleClaimPrize()}
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
                  Claim Prize
                </span>
              </Button>
            </div>
          </div>
        }
        
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
