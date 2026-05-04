import { useEffect } from "react";
import { useState }  from "react";
import { ethers }    from "ethers";
import { addresses } from "../contracts/addresses";
import TelTokenAbi   from "../abi/TelToken.json";
import NFTAbi        from "../abi/ContractNFT.json";
import GestorAbi     from "../abi/GestorDeContratoGarantido.json";

export default function MyJobs() {
    const [account,        setAccount]        = useState("");
    const [clientJobs,     setClientJobs]     = useState([]);
    const [ethBalance,     setEthBalance]     = useState("?");
    const [freelancerJobs, setFreelancerJobs] = useState([]);
    const [network,        setNetwork]        = useState();
    const [telBalance,     setTelBalance]     = useState("?");
  
    const statusMap = [
        "Criado",
        "Aceito",
        "Entregue",
        "Disputa",
        "Completo OK",
        "Completo Não Feito",
        "Cancelado"
    ];

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

    await load();
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


    load();
  };


    async function load() {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer   = await provider.getSigner();
        const account  = await signer.getAddress();

        const nft      = new ethers.Contract(addresses.NFT, NFTAbi.abi, provider);
        const gestor   = new ethers.Contract(addresses.Gestor, GestorAbi.abi, provider);

        const balance = await nft.balanceOf(account);

        let cJobs = [];
        let fJobs = [];
            
        for (let i = 0; i < balance; i++) {
            const tokenId = await nft.tokenOfOwnerByIndex(account, i);
            const meta = await nft.jobs(tokenId);

            const job = await gestor.jobs(meta.jobId);

            const formatted = {
                id: meta.jobId.toString(),
                payment: ethers.formatUnits(job.payment, 18),
                guarantee: ethers.formatUnits(job.guarantee, 18),
                deadline: Number(job.deadline),
                acceptDeadline: Number(job.acceptDeadline),
                status: Number(job.status)
            };

            if (Number(meta.role) === 0) {
                cJobs.push(formatted);
            } else {
                fJobs.push(formatted);
            }
        }

        setClientJobs(cJobs);
        setFreelancerJobs(fJobs);
    }





  // Entregar
  async function markDelivered(jobId) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const gestor = new ethers.Contract(addresses.Gestor, GestorAbi.abi, signer);

    const tx = await gestor.markDelivered(jobId);
    await tx.wait();

    load();
  }

  async function approveWork(jobId) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const gestor = new ethers.Contract(addresses.Gestor, GestorAbi.abi, signer);

    const tx = await gestor.approveWork(jobId);
    await tx.wait();

    load();
  }

  async function openDispute(jobId) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer   = await provider.getSigner();
    const gestor   = new ethers.Contract(addresses.Gestor, GestorAbi.abi, signer);
    const tx       = await gestor.openDispute(jobId);
    await tx.wait();

    load();
  }

  async function cancel(jobId) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const gestor = new ethers.Contract(addresses.Gestor, GestorAbi.abi, signer);

    const tx = await gestor.cancelIfNotAccepted(jobId);
    await tx.wait();

    load();
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
      <h1>Meus Jobs</h1>
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
    
    <div style={{ display: "flex", gap: "40px" }}>
      

      {/* CLIENTE */}
      <div style={{ width: "50%" }}>
        <h2>Como Cliente</h2>
        <hr />
        
        {clientJobs.map((job) => {
          const now = Date.now() / 1000;

          return (
            <div key={job.id} style={{ border: "1px solid gray", padding: "10px", margin: "10px" }}>
              <p>ID: {job.id}&nbsp;&nbsp;&nbsp;&nbsp; Status: <b>{statusMap[job.status]}</b></p>
              <p>Valor: {job.payment}&nbsp;&nbsp;&nbsp;&nbsp;Multa: {job.guarantee}</p>
              <p>Status: {statusMap[job.status]}</p>

              <p>Aceite em: {new Date(job.acceptDeadline * 1000).toLocaleString()}</p>
              <p>Entrega: {new Date(job.deadline * 1000).toLocaleString()}</p>
              
              <div style={{
                backgroundColor: "lightblue",
                padding: "10px",
                borderRadius: "5px",
                width: "300px",
                margin: "0 auto"
                }}>
                  Descrição das atividades do Job será implementado com IPFS
              </div>

              {/* cancelar se ninguém aceitou */}
              {job.status == 0 && now > job.acceptDeadline && (
                <button onClick={() => cancel(job.id)}>
                  Cancelar (ninguém aceitou)
                </button>
              )}

              {/* após entrega */}
              {job.status == 2 && (
                <>
                  <p>Taxa para disputa: 1/3 da Multa</p>
                  <button onClick={() => approveWork(job.id)}>
                    Trabalho Aceito
                  </button>

                  <button onClick={() => openDispute(job.id)}>
                    Questionar Trabalho
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* FREELANCER */}
      <div style={{ width: "50%" }}>
        <h2>Como Freelancer</h2>
        <hr />
        
        {freelancerJobs.map((job) => (
          <div key={job.id} style={{ border: "1px solid gray", padding: "10px", margin: "10px" }}>
            <p>ID: {job.id}&nbsp;&nbsp;&nbsp;&nbsp; Status: <b>{statusMap[job.status]}</b></p>
            <p>Valor: {job.payment}&nbsp;&nbsp;&nbsp;&nbsp;Multa: {job.guarantee}</p>
            <p>Aceite em: {new Date(job.acceptDeadline * 1000).toLocaleString()}</p>
            <p>Entrega: {new Date(job.deadline * 1000).toLocaleString()}</p>
            <div style={{
                backgroundColor: "lightblue",
                padding: "10px",
                borderRadius: "5px",
                width: "300px",
                margin: "0 auto"
                }}>
                  Descrição das atividades do Job será implementado com IPFS
            </div>
            <div style={{
                backgroundColor: "lightgreen",
                padding: "10px",
                borderRadius: "5px",
                width: "300px",
                margin: "0 auto"
                }}>
                  Resultado/execução do Job será implementado com IPFS
            </div>
            

            {job.status === 1 && (
              <button onClick={() => markDelivered(job.id)}>
                Concluí o trabalho
              </button>
            )}  
          </div>
        ))}
      </div>

    </div>
    </div>    
  );
}
