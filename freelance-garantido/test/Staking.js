const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Staking", function () {
  let token, staking;
  let owner, user, dao;

  beforeEach(async function () {
    [owner, user, dao] = await ethers.getSigners();

    // Deploy token (TelToken)
    const Token = await ethers.getContractFactory("TelToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    // Mint tokens para usuário
    await token.mint(user.address, 1000);

    // Deploy staking
    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(await token.getAddress());

    // Set DAO
    await staking.setDAO(dao.address);
  });



  // Stake
  it("Usuário pode fazer stake", async function () {
    await token.connect(user).approve(await staking.getAddress(), 500);

    await staking.connect(user).stake(500);

    expect(await staking.stakes(user.address)).to.equal(500);
  });

  // Stake inválido
  it("Não permite stake zero", async function () {
    await expect(
      staking.connect(user).stake(0)
    ).to.be.revertedWith("Invalid amount");
  });

  // Unstake
  it("Usuário pode fazer unstake", async function () {
    await token.connect(user).approve(await staking.getAddress(), 500);
    await staking.connect(user).stake(500);

    await staking.connect(user).unstake(200);

    expect(await staking.stakes(user.address)).to.equal(300);
  });

  // Unstake maior que stake
  it("Não permite unstake maior que saldo", async function () {
    await expect(
      staking.connect(user).unstake(100)
    ).to.be.revertedWith("Not enough");
  });

  // Lock (DAO)
  it("DAO pode travar stake", async function () {
    await token.connect(user).approve(await staking.getAddress(), 500);
    await staking.connect(user).stake(500);

    await staking.connect(dao).lock(user.address, 300);

    expect(await staking.stakes(user.address)).to.equal(200);
    expect(await staking.locked(user.address)).to.equal(300);
  });

  // Lock sem DAO
  it("Não DAO não pode travar stake", async function () {
    await expect(
      staking.connect(user).lock(user.address, 100)
    ).to.be.revertedWith("Not DAO");
  });

  // Unlock
  it("DAO pode desbloquear stake", async function () {
    await token.connect(user).approve(await staking.getAddress(), 500);
    await staking.connect(user).stake(500);

    await staking.connect(dao).lock(user.address, 300);
    await staking.connect(dao).unlock(user.address, 200);

    expect(await staking.locked(user.address)).to.equal(100);
    expect(await staking.stakes(user.address)).to.equal(400);
  });

  // Unlock inválido
  it("Não permite unlock maior que locked", async function () {
    await expect(
      staking.connect(dao).unlock(user.address, 100)
    ).to.be.revertedWith("Not enough locked");
  });

  // Slash
  it("DAO pode aplicar slash", async function () {
    await token.connect(user).approve(await staking.getAddress(), 500);
    await staking.connect(user).stake(500);

    await staking.connect(dao).lock(user.address, 300);
    await staking.connect(dao).slash(user.address, 100);

    expect(await staking.locked(user.address)).to.equal(200);
  });

  // Slash inválido
  it("Não permite slash maior que locked", async function () {
    await expect(
      staking.connect(dao).slash(user.address, 100)
    ).to.be.revertedWith("Not enough locked");
  });

  // Reward
  it("DAO pode enviar reward", async function () {
    // dar saldo ao contrato
    await token.mint(await staking.getAddress(), 500);

    const before = await token.balanceOf(user.address);

    await staking.connect(dao).reward(user.address, 200);

    const after = await token.balanceOf(user.address);

    expect(after - before).to.equal(200);
  });

  // Reward sem saldo
  it("Falha reward sem saldo no contrato", async function () {
    await expect(
      staking.connect(dao).reward(user.address, 100)
    ).to.be.reverted;
  });
});
