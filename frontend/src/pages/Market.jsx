import { ethers }    from "ethers";
import { useEffect } from "react";
import { useState }  from "react";
import { addresses } from "../contracts/addresses";
import TelTokenAbi   from "../abi/TelToken.json";
import TokenSaleAbi  from "../abi/TokenSale.json";

export default function Market() {
  const [account,     setAccount]      = useState("");
  const [ethAmount,   setEthAmount]    = useState("");
  const [ethBalance,  setEthBalance]   = useState("?");
  const [ethToTels,   setEthToTels]    = useState("?");
  const [network,     setNetwork]      = useState("");
  const [telAmount,   setTelAmount]    = useState("");
  const [telBalance,  setTelBalance]   = useState("?");
  const [ussToTels,   setUssToTels]    = useState("?");
  
  const updateConnection = async () => {
    setAccount(   "");
    setEthBalance("?");
    setEthToTels( "?");
    setNetwork(   "");
    setTelBalance("?");
    setUssToTels( "?");

    let provider;
    let token;
    let sale;
    try {
      provider = new ethers.BrowserProvider(window.ethereum);
      token = new ethers.Contract(
        addresses.TelToken,
        TelTokenAbi.abi,
        provider
      ); 
      sale = new ethers.Contract(
        addresses.TokenSale,
        TokenSaleAbi.abi,
        provider
      );
    } catch (err) {
      console.error("Erro ao buscar provider:", err);
      return;
    }

    let address;
    try{
      const accounts = await window.ethereum.request({method: "eth_requestAccounts",});
      if (accounts.length <= 0) {
        console.log("No Accounts");
        return;
      }else{
        address = accounts[0];
        setAccount(address);
      }
    } catch (err) {
      console.error("Erro ao buscar accounts:", err);
      return;
    }

    try{
      const network = await provider.getNetwork();
      setNetwork(`nome=${network.name}, id=${network.chainId}`);
    } catch (err) {
      console.error("Erro ao buscar Network:", err);
      return;
    }

    // Saldo em TELs
    try {
      const balanceTels   = await token.balanceOf(address);
      const formattedTels = ethers.formatEther(balanceTels);
      setTelBalance(formattedTels)
    } catch (err) {
      console.error("Erro ao buscar saldo de TELs:", err);
    }

    // Saldo em ETHs
    try {
      const balanceEths   = await provider.getBalance(address);
      const formattedEths = ethers.formatEther(balanceEths);
      setEthBalance(formattedEths);
    } catch (err) {
      console.error("Erro ao buscar saldo de ETHs:", err);
    }

    // Conversao ETHs to TELs
    try {
      const rateEthToTel    = await sale.getTelPerEth();
      const formattedEthToTel = ethers.formatUnits(rateEthToTel, 0); // uint256 sem decimals no contrato
      setEthToTels(formattedEthToTel); 
    } catch (err) {
      console.error("Erro ao buscar conversao ETHs para TELs:", err);
    }

    // Conversao USS to TELs
    try {
      const rateUssToTels     = await sale.getTelPerUsd();
      const formattedssToTels = ethers.formatUnits(rateUssToTels, 0); // uint256 sem decimals no contrato
      setUssToTels(formattedssToTels); 
    } catch (err) {
      console.error("Erro ao buscar conversao USS para TELs:", err);
    }
  }
   
  // conectar carteira
  const connect = async () => {
    //const accounts = await provider.send("eth_requestAccounts", []);
    if (!window.ethereum) {
      alert("MetaMask não encontrado");
      return;
    }

    // força abrir popup de permissões
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }]
    });

    await updateConnection(); 
  };

  // Comprar TELs
  const buy = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const sale = new ethers.Contract(
      addresses.TokenSale,
      TokenSaleAbi.abi,
      signer
    );

    const tx = await sale.buyTokens({
      value: ethers.parseEther(ethAmount || "0")
    });
    await tx.wait();
    
    await updateConnection(); 

    alert(`Tokens comprados!`);
  };
  
  // Vender TELs
  const sell = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const token = new ethers.Contract(
      addresses.TelToken,
      TelTokenAbi.abi,
      signer
    );

    const sale = new ethers.Contract(
      addresses.TokenSale,
      TokenSaleAbi.abi,
      signer
    );

   const amount = ethers.parseUnits(telAmount, 18);
   //const amount = ethers.parseEther(ethAmount || "0")
    
    
    // Aprovar
    const txApprove = await token.approve(addresses.TokenSale, amount);
    await txApprove.wait();
    
    // Vender
    const txSell = await sale.sellTokens(amount);
    await txSell.wait();

    await updateConnection(); 

    alert("Tokens vendidos!");
  };


  // Roda ao carregar
  useEffect(() => {
    updateConnection();
  }, []);

  // Escuta mudanças
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = () => updateConnection();
    const handleChainChanged    = () => updateConnection();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged",    handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged",    handleChainChanged);
    };
  }, []);


  return (   
    <div>
      <h1>Mercado de TELs</h1>
      <hr />

      <button onClick={connect}>
        {account ? "Reconectar/Trocar Carteira" : "Conectar Carteira"}
      </button>
      <p>Rede: {network}</p>
      <p>Conta: {account}</p>
      
      <p><b>Saldos</b></p>
      <p>TELs: {telBalance}</p>
      <p>ETHs: {ethBalance}</p>

      <p><b>Valor atual</b></p>
      <p> 1 ETH = {ethToTels} TELs </p>
      <p> 1 US$ = {ussToTels} TELs </p>
      <hr />

      <h3>Comprar Tokens (ETHs ==&gt; TELs)</h3>
      <input
        type="text"
        placeholder="Quantidade de ETHs"
        value={ethAmount}
        onChange={(e) => setEthAmount(e.target.value)}
      />
      &nbsp;
      <button onClick={buy}>Comprar</button>
      <hr />
      
      <h3>Vender Tokens (TELs ==&gt; ETHs)</h3>
      <input
        type="text"
        placeholder="Quantidade de TELs"
        value={telAmount}
        onChange={(e) => setTelAmount(e.target.value)}
      />
      &nbsp;
      <button onClick={sell}>Vender</button>
    </div>
  );
}
