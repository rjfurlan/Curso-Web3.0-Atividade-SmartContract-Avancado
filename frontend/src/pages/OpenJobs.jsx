import { ethers }    from "ethers";
import { useEffect } from "react";
import { useState }  from "react";
import { addresses } from "../contracts/addresses";
import GestorAbi     from "../abi/GestorDeContratoGarantido.json";
import TelTokenAbi   from "../abi/TelToken.json";

export default function OpenJobs() {
  const [account,     setAccount]      = useState("");
  const [ethBalance,  setEthBalance]   = useState("?");
  const [jobs,        setJobs]         = useState([]);
  const [network,     setNetwork]      = useState("");
  const [telBalance,  setTelBalance]   = useState("?");

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

    await loadJobs();
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

  const loadJobs = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const gestor   = new ethers.Contract(
      addresses.Gestor,
      GestorAbi.abi,
      provider
    );

    const count  = await gestor.jobCount();
    let openJobs = [];
    for (let i = 0; i < count; i++) {
      const job = await gestor.jobs(i);

      if (
        job.status == 0 
      ) {
        openJobs.push({
          id:             i,
          payment:        ethers.formatUnits(job.payment, 18),
          guarantee:      ethers.formatUnits(job.guarantee, 18),
          deadline:       Number(job.deadline),
          acceptDeadline: Number(job.acceptDeadline),
        });
        console.log(`${i})  Status=${job.status}`);
      }
    }

    setJobs(openJobs);
  };

  async function acceptJob(jobId) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer   = await provider.getSigner();

    const gestor = new ethers.Contract(
      addresses.Gestor,
      GestorAbi.abi,
      signer
    );

    console.log(`gestor=${gestor}`);
    const job = await gestor.jobs(jobId);
    console.log(`Passo1`);

    // precisa aprovar garantia
    const token = new ethers.Contract(
      addresses.TelToken,
      TelTokenAbi.abi,
      signer
    );

    await token.approve(addresses.Gestor, job.guarantee);
    const approveTx = await token.approve(
      addresses.Gestor,
      job.guarantee
    );
    await approveTx.wait();

    try{
        const tx = await gestor.acceptJob(jobId);
        await tx.wait();
        alert("Job aceito!");
    } catch (e) {
        console.error("Erro completo:", e);
        if (e.shortMessage) {
        console.error("Short:", e.shortMessage);
        }
        if (e.reason) {
            console.error("Reason:", e.reason);
        }

        if (e.data) {
          console.error("Data:", e.data);
        }
        alert("Job Erro");
    }        
    
    await updateConnection();   // atualiza lista
  }


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
      <h1>Jobs Abertos</h1>
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
      
      {jobs.map((job) => (
        <div
          key={job.id}
          style={{ border: "1px solid gray", margin: "10px", padding: "10px" }}
        >
          <p>ID: {job.id}</p>
          <p>Valor: {job.payment} TELs&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Multa: {job.guarantee} TELs</p>
          <p>Data máxima para aceite: {new Date(job.acceptDeadline * 1000).toLocaleString()}</p>
          <p>Data limite de Entrega: {new Date(job.deadline * 1000).toLocaleString()}</p>
          <div style={{
                backgroundColor: "lightblue",
                padding: "10px",
                borderRadius: "5px",
                width: "300px",
                margin: "0 auto"
                }}>
                  Descrição das atividades do Job será implementado com IPFS
              </div>


          <button onClick={() => acceptJob(job.id)}>
            Aceitar Job
          </button>
        </div>
      ))}
    </div>
  );
}
