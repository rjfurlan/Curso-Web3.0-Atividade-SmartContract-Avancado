const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TelToken", function () {
  let Token, token;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    Token = await ethers.getContractFactory("TelToken");
    token = await Token.deploy();
    await token.waitForDeployment();
  });



  // Teste básico de deploy
  it("Deve ter nome e símbolo corretos", async function () {
    expect(await token.name()).to.equal("Freelance Token");
    expect(await token.symbol()).to.equal("TEL");
  });

  // Owner correto
  it("Deve definir o owner corretamente", async function () {
    expect(await token.owner()).to.equal(owner.address);
  });

  // Mint pelo owner
  it("Owner pode mintar tokens", async function () {
    await token.mint(addr1.address, 1000);

    expect(await token.balanceOf(addr1.address)).to.equal(1000);
  });

  // Mint por não-owner deve falhar
  it("Não-owner NÃO pode mintar", async function () {
    await expect(
      token.connect(addr1).mint(addr1.address, 1000)
    ).to.be.reverted;
  });

  // Burn funcionando
  it("Usuário pode queimar seus tokens", async function () {
    await token.mint(addr1.address, 1000);
    await token.connect(addr1).burn(400);

    expect(await token.balanceOf(addr1.address)).to.equal(600);
  });

  // Burn maior que saldo deve falhar
  it("Não pode queimar mais do que o saldo", async function () {
    await token.mint(addr1.address, 500);

    await expect(
      token.connect(addr1).burn(1000)
    ).to.be.reverted;
  });

  // Total supply correto
  it("Total supply deve atualizar corretamente", async function () {
    await token.mint(addr1.address, 1000);
    await token.mint(addr2.address, 500);

    expect(await token.totalSupply()).to.equal(1500);

    await token.connect(addr1).burn(200);

    expect(await token.totalSupply()).to.equal(1300);
  });

  // Edge case: mint para address zero
  it("Não deve permitir mint para address zero", async function () {
    await expect(
      token.mint(ethers.ZeroAddress, 1000)
    ).to.be.reverted;
  });
});
