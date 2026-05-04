import { useEffect } from "react";
import { useState }  from "react";
import { ethers }    from "ethers";
import DAOAbi        from "../abi/DAO.json";
import StakingAbi    from "../abi/Staking.json"; 
import TelTokenAbi   from "../abi/TelToken.json";
import { addresses } from "../contracts/addresses";

export default function DAO() {
  const [account,       setAccount]       = useState("");
  const [disputes,      setDisputes]      = useState([]);
  const [ethBalance,    setEthBalance]    = useState("?");
  const [network,       setNetwork]       = useState("");
  const [stakeAmount,   setStakeAmount]   = useState("");
  const [stakeFree,     setStakeFree]     = useState("?");
  const [stakeLocked,   setStakeLocked]   = useState("?");
  const [stakeTotal,    setStakeTotal]    = useState("?");
  const [telBalance,    setTelBalance]    = useState("?");
  const [unstakeAmount, setUnstakeAmount] = useState("");

  const updateConnection = async () => {
    setAccount(    "");
    setNetwork(    "");
    setEthBalance( "?");
    setStakeFree(  "?");
    setStakeLocked("?");
    setStakeTotal( "?");
    setTelBalance( "?");
    setDisputes([]);
    
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

    loadDisputes();
    console.log(`Adrress:${address}`);
    if(address) loadStake(provider, address);  
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

  // Carregar stakes
  async function loadStake(provider, address) {
    const staking = new ethers.Contract(
      addresses.Staking,
      StakingAbi.abi,
      provider
    );

    const free   = await staking.stakes(address);
    const locked = await staking.locked(address);

    setStakeFree(ethers.formatUnits(  free,        18));
    setStakeLocked(ethers.formatUnits(locked,      18));
    setStakeTotal(ethers.formatUnits( free+locked, 18));
  }

  // Stake (depositar)
  async function doStake() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const amount = ethers.parseUnits(stakeAmount || "0", 18);

      const staking = new ethers.Contract(
        addresses.Staking,
        StakingAbi.abi,
        signer
      );

      const token = new ethers.Contract(
        addresses.TelToken,
        TelTokenAbi.abi,
        signer
      );
      
      // 1. aprovar
      const txApprove = await token.approve(addresses.Staking, amount);
      await txApprove.wait();

      // 2. depois stake
      const tx = await staking.stake(amount);
      await tx.wait();

      alert("Stake realizado!");
      loadStake();
    } catch (e) {
      console.error(e);
      alert("Erro ao fazer stake");
    }
  }

  // Unstake (retirar)
  async function doUnstake() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const staking = new ethers.Contract(
        addresses.Staking,
        StakingAbi.abi,
        signer
      );

      const amount = ethers.parseUnits(unstakeAmount || "0", 18);

      const tx = await staking.unstake(amount);
      await tx.wait();

      alert("Unstake realizado!");
      loadStake();
    } catch (e) {
      console.error(e);
      alert("Erro ao fazer unstake");
    }
  }

  // Carregar disputas
  async function loadDisputes() {
    const provider = new ethers.BrowserProvider(window.ethereum);

    const dao = new ethers.Contract(
      addresses.DAO,
      DAOAbi.abi,
      provider
    );

    const count = await dao.disputeCount();

    let list = [];

    for (let i = 0; i < Number(count); i++) {
      const d = await dao.disputes(i);
      console.log(`Tax:${d.stakePerJuror}  ${ethers.formatUnits(d.stakePerJuror, 18)}`);

      list.push({
        id:              i,
        jobId:           d.jobId,
        votesClient:     d.votesClient,
        votesFreelancer: d.votesFreelancer,
        resolved:        d.resolved,
        tax:             ethers.formatUnits(d.stakePerJuror,        18),
      });
    }

    setDisputes(list);
  }

  // Votar
  async function vote(disputeId, voteFreelancer) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const dao = new ethers.Contract(
        addresses.DAO,
        DAOAbi.abi,
        signer
      );

      const tx = await dao.vote(disputeId, voteFreelancer);
      await tx.wait();

      alert("Voto enviado!");
      loadDisputes();
      loadStake();
    } catch (e) {
      console.error(e);
      alert("Erro ao votar");
    }
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
      <h1>Disputas - DAO</h1>
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


      <h2>Garantias</h2>
      <p>Stake Livre: {stakeFree} TELs</p>
      <p>Stake Bloqueado: {stakeLocked} TELs</p>
      <p>Stake Total: {stakeTotal} TELs</p>

      <p>
        <b>Adicionar Stake:&nbsp;</b>
        <input
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          placeholder="Quantidade"
        />
        &nbsp;
        <button onClick={doStake}>Stake</button>
      </p>

      <p>
        <b>Remover Stake:&nbsp;</b>
        <input
          value={unstakeAmount}
          onChange={(e) => setUnstakeAmount(e.target.value)}
          placeholder="Quantidade"
        />
        &nbsp;
        <button onClick={doUnstake}>Unstake</button>
      </p>
      <hr />

      {/* DISPUTAS */}

      {disputes.length === 0 && <p>Nenhuma disputa</p>}

      {disputes.map((d) => {
        const totalVotes  = Number(d.votesClient) + Number(d.votesFreelancer);
        const telsPorVoto = d.tax;

        const result =
          d.votesFreelancer > d.votesClient
            ? "Freelancer venceu"
            : "Cliente venceu";

        return (
          <div
            key={d.id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <p><b>Disputa:</b> {d.id} &nbsp;&nbsp;&nbsp;<b>Job:</b> {d.jobId.toString()}</p>
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

            <p><b>Votos:</b> {totalVotes}&nbsp;&nbsp;&nbsp;<b>Custo do voto:</b> {telsPorVoto} <b>TELs</b></p>

            {d.resolved ? (
              <p><b>Resultado:</b> {result}</p>
            ) : (
              <>
                <button onClick={() => vote(d.id, false)}>
                  Votar Cliente
                </button>
                &nbsp;&nbsp;
                <button onClick={() => vote(d.id, true)}>
                  Votar Freelancer
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
