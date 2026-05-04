const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO_1", function () {
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
    await dao.setConfig(owner.address, await staking.getAddress());

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



  // Abrir disputa
  it("Gestor pode abrir disputa", async function () {
    await dao.connect(owner).openCase(1, 100);

    const d = await dao.disputes(0);

    expect(d.jobId).to.equal(1);
    expect(d.stakePerJuror).to.equal(10); // 100 / 10
  });

  // Não gestor abre disputa
  it("Não gestor não pode abrir disputa", async function () {
    await expect(
      dao.connect(juror1).openCase(1, 100)
    ).to.be.revertedWith("Not gestor");
  });

  // Votação
  it("Jurados podem votar", async function () {
    await dao.connect(owner).openCase(1, 100);

    await dao.connect(juror1).vote(0, true);

    const d = await dao.disputes(0);

    expect(d.votesFreelancer).to.equal(1);
  });

  // Duplo voto
  it("Não permite votar duas vezes", async function () {
    await dao.connect(owner).openCase(1, 100);

    await dao.connect(juror1).vote(0, true);

    await expect(
      dao.connect(juror1).vote(0, true)
    ).to.be.revertedWith("Already voted");
  });

  // Sem stake suficiente
  it("Rejeita voto sem stake suficiente", async function () {
    await dao.connect(owner).openCase(1, 10000); // exige mais stake,  10000 / 10 = 1000

    await expect(
      dao.connect(juror1).vote(0, true)
    ).to.be.revertedWith("Not enough stake");
  });

  // Lock ocorre ao votar
  it("Stake é travado ao votar", async function () {
    await dao.connect(owner).openCase(1, 100);

    await dao.connect(juror1).vote(0, true);

    expect(await staking.locked(juror1.address)).to.equal(10);
  });
});
