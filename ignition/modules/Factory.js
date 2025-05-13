// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("hardhat");

const FEE = ethers.parseUnits("0.01", 18);

module.exports = buildModule("FactoryModule", (m) => {
  // get params
  const fee = m.getParameter("fee", FEE);

  // define the contract
  const factory = m.contract("Factory", [fee]);

  // return factory
  return { factory };
});
