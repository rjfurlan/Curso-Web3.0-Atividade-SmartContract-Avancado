const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ContractNFT", function () {
  let nft;
  let owner, gestor, user;

  beforeEach(async function () {
    [owner, gestor, user] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("ContractNFT");
    nft = await NFT.deploy();
    await nft.waitForDeployment();
  });

  // Set gestor
  it("Deve definir gestor apenas uma vez", async function () {
    await nft.setGestor(gestor.address);

    expect(await nft.gestor()).to.equal(gestor.address);

    await expect(
      nft.setGestor(owner.address)
    ).to.be.revertedWith("Already set");
  });

  // Mint sem gestor
  it("Não permite mint sem gestor", async function () {
    await expect(
      nft.mint(user.address, 1, 0)
    ).to.be.revertedWith("Not authorized");
  });

  // Mint com gestor
  it("Gestor pode mintar NFT", async function () {
    await nft.setGestor(gestor.address);

    await nft.connect(gestor).mint(user.address, 1, 0);

    expect(await nft.ownerOf(0)).to.equal(user.address);

    const job = await nft.jobs(0);

    expect(job.jobId).to.equal(1);
    expect(job.owner).to.equal(user.address);
    expect(job.role).to.equal(0);
    expect(job.active).to.equal(true);
  });

  // Incrementa nftCount
  it("Deve incrementar nftCount corretamente", async function () {
    await nft.setGestor(gestor.address);

    await nft.connect(gestor).mint(user.address, 1, 0);
    await nft.connect(gestor).mint(user.address, 2, 1);

    expect(await nft.nftCount()).to.equal(2);
  });

  // Retorno do mint
  it("Mint retorna tokenId correto", async function () {
    await nft.setGestor(gestor.address);

    const tx = await nft.connect(gestor).mint(user.address, 99, 1);
    const receipt = await tx.wait();

    // alternativa mais simples:
    expect(await nft.ownerOf(0)).to.equal(user.address);
  });

  // Testa jobToTokens
  it("Deve mapear jobId para tokens", async function () {
    await nft.setGestor(gestor.address);

    await nft.connect(gestor).mint(user.address, 1, 0);
    await nft.connect(gestor).mint(user.address, 1, 1);

    const tokens = await nft.getTokensByJob(1);

    expect(tokens.length).to.equal(2);
    expect(tokens[0]).to.equal(0);
    expect(tokens[1]).to.equal(1);
  });

  // Apenas gestor pode fechar job
  it("Não permite fechar job sem gestor", async function () {
    await nft.setGestor(gestor.address);

    await nft.connect(gestor).mint(user.address, 1, 0);

    await expect(
      nft.connect(user).closeJob(0)
    ).to.be.revertedWith("Not authorized");
  });

  // Fechar job
  it("Gestor pode fechar job", async function () {
    await nft.setGestor(gestor.address);

    await nft.connect(gestor).mint(user.address, 1, 0);

    await nft.connect(gestor).closeJob(0);

    const job = await nft.jobs(0);

    expect(job.active).to.equal(false);
  });

  // Token inexistente
  it("Falha ao acessar token inexistente", async function () {
    await expect(
      nft.ownerOf(999)
    ).to.be.reverted;
  });

  // ERC721Enumerable
  it("Deve enumerar tokens corretamente", async function () {
    await nft.setGestor(gestor.address);

    await nft.connect(gestor).mint(user.address, 1, 0);
    await nft.connect(gestor).mint(user.address, 2, 1);

    expect(await nft.totalSupply()).to.equal(2);
    expect(await nft.tokenOfOwnerByIndex(user.address, 0)).to.equal(0);
  });
});
