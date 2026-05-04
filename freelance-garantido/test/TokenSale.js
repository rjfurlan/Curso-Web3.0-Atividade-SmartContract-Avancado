const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenSale", function () {
  let token, sale, owner, user;

  const RATE      = 1_000_000;
  const price_ref = 321000000000n; // 3210 USD (8 decimals)

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy Token
    const Token = await ethers.getContractFactory("TelToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    
    const Mock = await ethers.getContractFactory("MockV3AggregatorTest");
    const mock = await Mock.deploy(price_ref);
    await mock.waitForDeployment();

    // Deploy TokenSale
    const Sale = await ethers.getContractFactory("TokenSale");
    sale = await Sale.deploy(await token.getAddress(), await mock.getAddress());
    await sale.waitForDeployment();

    // IMPORTANTE: dar permissão de mint para o contrato de venda
    await token.transferOwnership(await sale.getAddress());
  });



  // Teste oracle
  it("Deve retornar preço ETH/USD", async function () {
    const price = await sale.getEthUsdPrice();
    expect(price).to.equal(price_ref);
  });

  // Compra de tokens
  it("Usuário pode comprar tokens", async function () {
    const value = ethers.parseEther("1"); // 1 ETH
    await sale.connect(user).buyTokens({ value });
    const balance = await token.balanceOf(user.address);

    // 1 ETH - 1% taxa → 0.99 ETH * rate
    const expected = (value * 99n / 100n) * BigInt(RATE);

    expect(balance).to.equal(expected);
  });

  // Compra sem ETH
  it("Não permite compra sem ETH", async function () {
    await expect(
      sale.connect(user).buyTokens({ value: 0 })
    ).to.be.reverted;
  });

  // Venda de tokens
  it("Usuário pode vender tokens", async function () {
    const value = ethers.parseEther("1");

    // Compra primeiro
    await sale.connect(user).buyTokens({ value });

    const balance = await token.balanceOf(user.address);

    // Aprovar contrato
    await token.connect(user).approve(await sale.getAddress(), balance);

    // Enviar ETH pro contrato para pagar venda
    await sale.connect(owner).deposit({
      value: ethers.parseEther("10"),
    });
    const before = await ethers.provider.getBalance(user.address);
    await sale.connect(user).sellTokens(balance);
    const after = await ethers.provider.getBalance(user.address);
    
    expect(after).to.be.gt(before);
  });

  // Venda sem saldo
  it("Não permite vender sem saldo", async function () {
    await expect(
      sale.connect(user).sellTokens(1000)
    ).to.be.reverted;
  }); 

  // Teste de fee
  it("Deve cobrar taxa de 1%", async function () {
    const value       = ethers.parseEther("1");
    const ownerBefore = await ethers.provider.getBalance(owner.address);
    await sale.connect(user).buyTokens({ value });
    const ownerAfter  = await ethers.provider.getBalance(owner.address);

    expect(ownerAfter).to.be.gt(ownerBefore);
  });

  // Edge case: preço inválido
  it("Falha se oracle retornar preço inválido", async function () {
    const Mock    = await ethers.getContractFactory("MockV3AggregatorTest");
    const mockBad = await Mock.deploy(0);
    const Sale    = await ethers.getContractFactory("TokenSale");
    const badSale = await Sale.deploy(
      await token.getAddress(),
      await mockBad.getAddress()
    );

    await expect(
      badSale.getEthUsdPrice()
    ).to.be.revertedWith("Invalid price");
  });
});
