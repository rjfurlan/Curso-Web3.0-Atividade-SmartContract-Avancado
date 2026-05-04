const hre = require("hardhat");

async function main() {
  const ethers = hre.ethers;

  if (!ethers) {
    throw new Error("ethers não está carregado. Verifique o plugin hardhat-ethers.");
  }

  const [deployer] = await ethers.getSigners();

  console.log("Deploying with:", deployer.address);

  const Token = await ethers.getContractFactory("TelToken");
  const token = await Token.deploy();
  await token.waitForDeployment();

// ----- Endereços do Chainlink Price Feed -----
// Para: ETH/USD no Ethereum Mainnet:
//      const ETH_USD_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";

// Para: ETH/USD no Sepolia (teste):
  const ETH_USD_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

// Para: ETH/USD no HardHat
//  const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
//  const mockV3Aggregator = await MockV3Aggregator.deploy();
//  await mockV3Aggregator.waitForDeployment();
//  const ETH_USD_FEED = mockV3Aggregator.getAddress();

  
  const TokenSale = await ethers.getContractFactory("TokenSale");
  const tokenSale = await TokenSale.deploy(await token.getAddress(), ETH_USD_FEED);
  await tokenSale.waitForDeployment();
  // o Dono do contrato tem que ser o próprio contrato
  await token.transferOwnership(await tokenSale.getAddress());

  const NFT = await ethers.getContractFactory("ContractNFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  
  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(await token.getAddress());
  await staking.waitForDeployment();

  const DAO = await ethers.getContractFactory("DAO");
  const dao = await DAO.deploy();
  await dao.waitForDeployment();
  
  const Gestor = await ethers.getContractFactory("GestorDeContratoGarantido");
  const gestor = await Gestor.deploy(await token.getAddress(), await nft.getAddress(), await dao.getAddress());
  await gestor.waitForDeployment();

  await dao.setConfig( await gestor.getAddress(), await staking.getAddress());
  await nft.setGestor( await gestor.getAddress());
  await staking.setDAO(await dao.getAddress());

  console.log("TelToken : ", await token.getAddress());
  console.log("TokenSale: ", await tokenSale.getAddress());
  console.log("NFT      : ", await nft.getAddress());
  console.log("Staking  : ", await staking.getAddress());
  console.log("DAO      : ", await dao.getAddress());
  console.log("Gestor   : ", await gestor.getAddress());
//  console.log("MockV3Ag : ", await mockV3Aggregator.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
