const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { extendEnvironment } = require("hardhat/config");

describe("Factory", () => {
  const FEE = ethers.parseUnits("0.01", 18);

  async function deployFactoryFixture() {
    // initialize contract
    const Factory = await ethers.getContractFactory("Factory");
    // initialize deployer
    const [deployer, creator, buyer] = await ethers.getSigners();
    // deploy contract
    const factory = await Factory.deploy(FEE);

    // create token
    const transaction = await factory.connect(creator).create("Dapp Uni", "DAPP", { value: FEE });
    await transaction. wait();

    // get token address
    const tokenAddress = await factory.tokens(0);
    const token = await ethers.getContractAt("Token", tokenAddress);
    
    return { factory, deployer, creator, token, buyer };
  };

  async function buyTokenFixture() {
    const { factory, token, creator, buyer } = await deployFactoryFixture();

    const AMOUNT = ethers.parseUnits("10000", 18);
    const COST = ethers.parseUnits("1", 18);

    // buy token
    const tx = await factory.connect(buyer).buy(await token.getAddress(), AMOUNT, { value: COST });
    await tx.wait();

    return { factory, token, buyer, creator };
  };

  describe("Deployment", () => {
    it("Should set the fee", async () => {
      const { factory } = await loadFixture(deployFactoryFixture);
      expect(await factory.fee()).to.equal(FEE)
    });

    it("Should set the owner", async () => {
      const { factory, deployer } = await loadFixture(deployFactoryFixture);
      expect(await factory.owner()).to.equal(deployer.address);
    });
  });

  describe("Creating", () => {
    it("Should set the owner", async () => {
      const { factory, token } = await loadFixture(deployFactoryFixture);
      expect(await token.owner()).to.equal(await factory.getAddress());
    });

    it("Should set the creator", async () => {
      const { creator, token } = await loadFixture(deployFactoryFixture);
      expect(await token.creator()).to.equal(creator.address);
    });

    it("Should set the supply", async () => {
      const { factory, token } = await loadFixture(deployFactoryFixture);
      const totalSupply = ethers.parseUnits("1000000", 18);
      expect(await token.balanceOf(await factory.getAddress())).to.equal(totalSupply);
    });

    it("Should update ETH balance", async () => {
      const { factory } = await loadFixture(deployFactoryFixture);

      const balance = await ethers.provider.getBalance(await factory.getAddress());
      expect(balance).to.equal(FEE);
    });

    it("Should create the sale", async () => {
      const { factory, token, creator } = await loadFixture(deployFactoryFixture);

      const count = await factory.totalTokens();
      expect(count).to.equal(1);

      const sale = await factory.getTokenSale(0);

      expect(sale.token).to.equal(await token.getAddress());
      expect(sale.creator).to.equal(creator.address);
      expect(sale.sold).to.equal(0);
      expect(sale.raised).to.equal(0);
      expect(sale.isOpen).to.equal(true);

    })
  });

  describe("Buying", () => {
    const AMOUNT = ethers.parseUnits("10000", 18);
    const COST = ethers.parseUnits("1", 18);

    // check contract received ETH
    it("Should update ETH balance", async () => {
      const { factory } = await loadFixture(buyTokenFixture);

      const balance = await ethers.provider.getBalance(await factory.getAddress());
      expect(balance).to.equal(FEE + COST);
    });

    it("Should update token balances", async () => {
      const { token, buyer } = await loadFixture(buyTokenFixture);

      const balance = await token.balanceOf(buyer.address);
      expect(balance).to.equal(AMOUNT)
    });

    it("Should update token sale", async () => {
      const { factory, token } = await loadFixture(buyTokenFixture);

      const sale = await factory.tokenToSale(await token.getAddress());

      expect(sale.sold).to.equal(AMOUNT);
      expect(sale.raised).to.equal(COST);
      expect(sale.isOpen).to.equal(true);

    });

    it("Should increase base cost", async () => {
      const { factory, token } = await loadFixture(buyTokenFixture);

      const sale = await factory.tokenToSale(await token.getAddress());
      const cost = await factory.getCost(sale.sold);

      expect(cost).to.be.equal(ethers.parseUnits("0.0002"))
    });
  });

  describe("Deposit", () => {
    const AMOUNT = ethers.parseUnits("10000", 18);
    const COST = ethers.parseUnits("2", 18);

    it("Sale should be closed and successfully deposits", async () => {
      const { factory, token, creator, buyer } = await loadFixture(buyTokenFixture);

      // Buy token against to reach target
      const buyTx = await factory.connect(buyer).buy(await token.getAddress(), AMOUNT, { value: COST });
      await buyTx.wait();

      const sale = await factory.tokenToSale(await token.getAddress());
      expect(sale.isOpen).to.equal(false);

      const depositTx = await factory.connect(creator).deposit(await token.getAddress());
      await depositTx.wait();

      const balance = await token.balanceOf(creator.address);
      expect(balance).to.equal(ethers.parseUnits("980000", 18));
    });
  });

  describe("Whitdraw Fees", () => {
    it("Should update ETH balance", async () => {
      const { factory, deployer } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(deployer).withdraw(FEE);
      await tx.wait();

      const balance = await ethers.provider.getBalance(await factory.getAddress());
      expect(balance).to.equal(0);
    })
  });
})