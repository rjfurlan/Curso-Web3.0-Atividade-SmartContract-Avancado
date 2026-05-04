const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GestorDeContratoGarantido", function () {
  let token, nft, dao, gestor;
  let owner, client, freelancer;

  beforeEach(async function () {
    [owner, client, freelancer] = await ethers.getSigners();

    // Token
    const Token = await ethers.getContractFactory("TelToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    // NFT mock
    const NFT = await ethers.getContractFactory("MockContractNFT");
    nft = await NFT.deploy();

    // DAO mock
    const DAO = await ethers.getContractFactory("MockDAO");
    dao = await DAO.deploy();

    // Gestor
    const Gestor = await ethers.getContractFactory("GestorDeContratoGarantido");
    gestor = await Gestor.deploy(
      await token.getAddress(),
      await nft.getAddress(),
      await dao.getAddress()
    );

    // Mint tokens para client e freelancer
    await token.mint(client.address, 1_000_000);
    await token.mint(freelancer.address, 1_000_000);
  });



  // Criar job
  it("Deve criar job corretamente", async function () {
    await token.connect(client).approve(await gestor.getAddress(), 2000);

    await gestor.connect(client).createJob(
      1000, // payment
      500,  // guarantee
      9999999999, // deadline
      9999999999  // acceptDeadline
    );

    const job = await gestor.jobs(0);

    expect(job.client).to.equal(client.address);
    expect(job.payment).to.equal(1000);
  });

  // Freelancer aceita
  it("Freelancer aceita job", async function () {
    await token.connect(client).approve(await gestor.getAddress(), 2000);
    await gestor.connect(client).createJob(1000, 500, 9999999999, 9999999999);

    await token.connect(freelancer).approve(await gestor.getAddress(), 500);

    await gestor.connect(freelancer).acceptJob(0);

    const job = await gestor.jobs(0);

    expect(job.freelancer).to.equal(freelancer.address);
  });

  // Entrega
  it("Freelancer marca como entregue", async function () {
    await token.connect(client).approve(await gestor.getAddress(), 2000);
    await gestor.connect(client).createJob(1000, 500, 9999999999, 9999999999);

    await token.connect(freelancer).approve(await gestor.getAddress(), 500);
    await gestor.connect(freelancer).acceptJob(0);

    await gestor.connect(freelancer).markDelivered(0);

    const job = await gestor.jobs(0);

    expect(job.status).to.equal(2); // Delivered
    expect(job.delivered).to.be.gt(0);
  });

  // Aprovação
  it("Cliente aprova trabalho", async function () {
    await token.connect(client).approve(await gestor.getAddress(), 2000);
    await gestor.connect(client).createJob(1000, 500, 9999999999, 9999999999);

    await token.connect(freelancer).approve(await gestor.getAddress(), 500);
    await gestor.connect(freelancer).acceptJob(0);
    await gestor.connect(freelancer).markDelivered(0);

    await gestor.connect(client).approveWork(0);

    const job = await gestor.jobs(0);

    expect(job.status).to.equal(4); // CompletedOk
  });

  // Não freelancer entrega
  it("Não freelancer não pode entregar", async function () {
    await token.connect(client).approve(await gestor.getAddress(), 2000);
    await gestor.connect(client).createJob(1000, 500, 9999999999, 9999999999);

    await expect(
      gestor.connect(client).markDelivered(0)
    ).to.be.revertedWith("Not freelancer");
  });

  // Timeout freelancer
  it("Cliente pode reclamar timeout", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;

    await token.connect(client).approve(await gestor.getAddress(), 2000);
    await gestor.connect(client).createJob(
      1000,
      500,
      now + 1, // deadline curto
      now + 1000
    );

    await token.connect(freelancer).approve(await gestor.getAddress(), 500);
    await gestor.connect(freelancer).acceptJob(0);

    // avançar tempo
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine");

    await gestor.connect(client).claimTimeout(0);

    const job = await gestor.jobs(0);

    expect(job.status).to.equal(5); // CompletedReject
  });

  // Cancelamento
  it("Cancela se ninguém aceitar", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;

    await token.connect(client).approve(await gestor.getAddress(), 2000);
    await gestor.connect(client).createJob(
      1000,
      500,
      now + 1000,
      now + 1
    );

    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine");

    await gestor.cancelIfNotAccepted(0);

    const job = await gestor.jobs(0);

    expect(job.status).to.equal(6); // Cancelled
  });
});
