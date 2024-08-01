import * as React from "react";
import { useState } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

import { cn } from "@/lib/utils";

// Default styles that can be overridden by your app
require("@solana/wallet-adapter-react-ui/styles.css");

export const CustomWalletButton = () => {
  const { visible, setVisible } = useWalletModal();
  const { publicKey, disconnect, connect } = useWallet();
  const [showModal, setShowModal] = useState(false);

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

  const requestPushNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("Push notifications enabled");
      } else {
        console.log("Push notifications denied");
      }
    } catch (error) {
      console.error("Error requesting push notifications:", error);
    }
  };

  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "Connect Wallet";

  return (
    <>
      <div className="flex space-x-4">
        <button
          className="relative inline-flex items-center justify-center p-8 px-12 py-4 overflow-hidden text-1xl font-medium text-white transition duration-300 ease-out bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-md group hover:from-orange-500 hover:to-yellow-400"
          onClick={requestPushNotifications}
          title="Enable Lottery Alerts"
        >
          <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-gradient-to-r from-orange-500 to-yellow-400 group-hover:translate-x-0 ease">
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              ></path>
            </svg>
          </span>
          <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">
            Lottery Alerts
          </span>
          <span className="relative invisible">Lottery Alerts</span>
        </button>

        <button
          className="relative inline-flex items-center justify-center p-8 px-12 py-4 overflow-hidden text-1xl font-medium text-white transition duration-300 ease-out bg-gradient-to-r from-green-400 to-blue-500 rounded-full shadow-md group hover:from-blue-500 hover:to-green-400"
          onClick={handleClick}
          title={publicKey ? "Click to manage wallet" : "Connect Wallet"}
        >
          {truncatedAddress}
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className="relative bg-gradient-to-r from-green-400 to-blue-500 p-8 rounded-lg shadow-lg text-white max-w-md mx-auto">
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
