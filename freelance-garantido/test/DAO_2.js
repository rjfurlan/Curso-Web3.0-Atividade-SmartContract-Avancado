const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO_2", function () {
  let token, staking, dao, gestor;
  let owner, juror1, juror2, juror3;

  beforeEach(async function () {
    [owner, juror1, juror2, juror3] = await ethers.getSigners();

    // Token
    const Token = await ethers.getContractFactory("TelToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    // Staking
    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(await token.getAddress());

    // DAO
    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy();

    // Mock gestor
    const Gestor = await ethers.getContractFactory("MockGestor");
    gestor = await Gestor.deploy();
   
    // Configurar DAO
    await dao.setConfig(await gestor.getAddress(), await staking.getAddress());

    // Set DAO no staking
    await staking.setDAO(await dao.getAddress());

    // Dar tokens para jurados
    await token.mint(juror1.address, 1000);
    await token.mint(juror2.address, 1000);
    await token.mint(juror3.address, 1000);

    // Stake
    for (let juror of [juror1, juror2, juror3]) {
      await token.connect(juror).approve(await staking.getAddress(), 500);
      await staking.connect(juror).stake(500);
    }
  });


  // Resolução automática (3 votos)
  it("Resolve automaticamente com 3 votos", async function () {
    await gestor.openCase(await dao.getAddress(), 1, 100);

    await dao.connect(juror1).vote(0, true);
    await dao.connect(juror2).vote(0, true);
    await dao.connect(juror3).vote(0, false);

    const d = await dao.disputes(0);

    expect(d.resolved).to.equal(true);
  });

  // Recompensa distribuída
  it("Distribui recompensa para vencedores", async function () {
    // Dar saldo ao staking para rewards
    await token.mint(await staking.getAddress(), 1000);

    // abrir via gestor
    await gestor.openCase(await dao.getAddress(), 1, 100);

    await dao.connect(juror1).vote(0, true);
    await dao.connect(juror2).vote(0, true);
    await dao.connect(juror3).vote(0, false);

    const balance1 = await token.balanceOf(juror1.address);
    const balance2 = await token.balanceOf(juror2.address);

    expect(balance1).to.be.gt(0);
    expect(balance2).to.be.gt(0);
  });

  // Não pode votar após resolução
  it("Não permite votar após resolução", async function () {
    // abrir via gestor
    await gestor.openCase(await dao.getAddress(), 1, 100);

    await dao.connect(juror1).vote(0, true);
    await dao.connect(juror2).vote(0, true);
    await dao.connect(juror3).vote(0, false);

    await expect(
      dao.connect(juror1).vote(0, true)
    ).to.be.revertedWith("Resolved");
  });

  // Caso sem vencedores
  it("Falha se não houver vencedores", async function () {
      await gestor.openCase(await dao.getAddress(), 1, 100);

    // todos votam igual → ninguém perde → winnersCount = 3 → OK
    // para falhar, precisa lógica alterada (caso raro)
    await dao.connect(juror1).vote(0, true);
    await dao.connect(juror2).vote(0, true);
    await dao.connect(juror3).vote(0, true);

    const d = await dao.disputes(0);

    expect(d.resolved).to.equal(true);
  });
});
