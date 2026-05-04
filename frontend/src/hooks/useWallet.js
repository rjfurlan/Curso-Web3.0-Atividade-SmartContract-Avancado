import { useState } from "react";
import { ethers } from "ethers";

export function useWallet() {
  const [account, setAccount] = useState(null);

  const connect = async () => {
    if (!window.ethereum) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);

    setAccount(accounts[0]);
  };

  return { account, connect };
}
