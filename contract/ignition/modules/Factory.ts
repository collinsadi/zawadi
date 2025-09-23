import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("FactoryModule", (m) => {
  // Deploy the Factory contract
  const factory = m.contract("Factory");

  // Optional: Set up initial configuration or ownership transfer
  // This can be uncommented if you want to transfer ownership to a specific address
  // const newOwner = m.getAccount(1); // Get the second account as new owner
  // m.call(factory, "transferOwnership", [newOwner]);

  return { factory };
});
