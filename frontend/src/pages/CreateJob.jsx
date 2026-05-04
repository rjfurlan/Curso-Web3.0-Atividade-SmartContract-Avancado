import { useEffect } from "react";
import { useState }  from "react";
import { ethers }    from "ethers";
import { addresses } from "../contracts/addresses";
import TelTokenAbi   from "../abi/TelToken.json";
import GestorAbi     from "../abi/GestorDeContratoGarantido.json";

export default function CreateJob() {
  const [acceptDeadline, setAcceptDeadline] = useState("");
  const [account,        setAccount]        = useState("");
  const [deadline,       setDeadline]       = useState("");
  const [ethBalance,     setEthBalance]     = useState("?");
  const [guarantee,      setGuarantee]      = useState("");
  const [network,        setNetwork]        = useState("");
  const [payment,        setPayment]        = useState("");
  const [telBalance,     setTelBalance]     = useState("?");

  const updateConnection = async () => {
    setAccount(   "");
    setNetwork(   "");
    setEthBalance("?");
    setTelBalance("?");

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



  // Conectar carteira
  async function connectWallet(openWallet) {
    if (!window.ethereum) {
      alert("MetaMask não encontrado");
      return;
    }
    
    // força abrir popup de permissões
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }]
    })
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await window.ethereum.request({method: "eth_requestAccounts",});
    
    setAccount(accounts[0]);
    
    const net = await provider.getNetwork()
    
    setNetwork(`Name=${network.name}, Id=${network.chainId}`);
  }

  const createJob = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer   = await provider.getSigner();

    const token  = new ethers.Contract(addresses.TelToken, TelTokenAbi.abi,  signer);
    const gestor = new ethers.Contract(addresses.Gestor,   GestorAbi.abi, signer);

    const paymentWei   = ethers.parseUnits(payment, 18);
    const guaranteeWei = ethers.parseUnits(guarantee, 18);
    
    // converter datas para timestamp
    const acceptTs   = Math.floor(new Date(acceptDeadline).getTime() / 1000);
    const deadlineTs = Math.floor(new Date(deadline).getTime()       / 1000);
    
    if (deadlineTs <= acceptTs) {
      alert("Deadline deve ser maior que prazo de aceitação");
      return;
    }

    const feePercent = 2;
    const fee   = (paymentWei * BigInt(feePercent)) / 100n;
    const total = paymentWei + fee;

    // 1. approve
    const approveTx = await token.approve(addresses.Gestor, total);
    await approveTx.wait();

    // 2. createJob
    const now = Math.floor(Date.now() / 1000);
    const tx = await gestor.createJob(paymentWei, guaranteeWei, deadlineTs, acceptTs);
    await tx.wait();

    alert("Contrato criado com sucesso!");
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
      <h1>Criar Jobs</h1>
      <hr />
      
      <button onClick={connect}>
        {account ? "Reconectar/Trocar Carteira" : "Conectar Carteira"}
      </button>
      <p>Rede: {network}</p>
      <p>Conta: {account}</p>
      <p><b>Saldos</b></p>
      <p>TELs: {telBalance}</p>
      <p>ETHs: {ethBalance}</p>
      <hr />
      
    <div>
      <div>
        <label>Valor do Job:</label>
        &nbsp;
        <input
          placeholder="Valor do Job (TELs)"
          value={payment}
          onChange={(e) => setPayment(e.target.value)}
        />
      </div>

      <div>
        <label>Multa / Garantia:</label>
        &nbsp;
        <input
          placeholder="Multa / Garantia (TELs)"
          value={guarantee}
          onChange={(e) => setGuarantee(e.target.value)}
        />
      </div>
      
      <div>
        <label>Data máxima para aceite:</label>
        &nbsp;
        <input
          type="datetime-local"
          value={acceptDeadline}
          onChange={(e) => setAcceptDeadline(e.target.value)}
        />
      </div>
      
      <div>
        <label>Data limite de entrega:</label>
        &nbsp;
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>
      
      <div style={{
        backgroundColor: "lightblue",
        padding: "10px",
        borderRadius: "5px",
        width: "300px",
        margin: "0 auto"
      }}>
        Descrição das atividades do Job\nSerá implementado com IPFS
      </div>

      <button onClick={createJob}>
        Criar Contrato
      </button>
    </div>
    </div>    
  );
}
