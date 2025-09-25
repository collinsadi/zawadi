import type { Address, Hex } from 'viem';
import { readContract, simulateContract, waitForTransactionReceipt, writeContract } from 'wagmi/actions';
import { config } from '../config/wagmi';
import factoryAbi from '../abi/factory.json';

// Types inferred from Factory.sol docs
export type Hackathon = {
  ipfsCid: string;
  escrowContract: Address;
  organizer: Address;
  id: Hex; // bytes32
};

// Env helper
const getFactoryAddress = (): Address => {
  const addr = import.meta.env.VITE_FACTORY_ADDRESS as Address | undefined;
  if (!addr) {
    throw new Error('VITE_FACTORY_ADDRESS is not set in the environment');
  }
  return addr;
};

// Reads
export async function getHackathonById(hackathonId: Hex) {
  return readContract(config, {
    abi: factoryAbi,
    address: getFactoryAddress(),
    functionName: 'getHackathonById',
    args: [hackathonId],
  }) as Promise<Hackathon>;
}

export async function getAllHackathons() {
  return readContract(config, {
    abi: factoryAbi,
    address: getFactoryAddress(),
    functionName: 'getAllHackathons',
  }) as Promise<Hackathon[]>;
}

export async function getHackathonCount() {
  return readContract(config, {
    abi: factoryAbi,
    address: getFactoryAddress(),
    functionName: 'getHackathonCount',
  }) as Promise<bigint>;
}

export async function factoryOwner() {
  return readContract(config, {
    abi: factoryAbi,
    address: getFactoryAddress(),
    functionName: 'factoryOwner',
  }) as Promise<Address>;
}

// Writes
export async function createHackathon(ipfsCid: string) {
  // Simulate first to catch errors and get the request object
  const { request } = await simulateContract(config, {
    abi: factoryAbi,
    address: getFactoryAddress(),
    functionName: 'createHackathon',
    args: [ipfsCid],
  });

  const hash = await writeContract(config, request);
  const receipt = await waitForTransactionReceipt(config, { hash });
  return { hash, receipt };
}

export async function transferOwnership(newOwner: Address) {
  const { request } = await simulateContract(config, {
    abi: factoryAbi,
    address: getFactoryAddress(),
    functionName: 'transferOwnership',
    args: [newOwner],
  });

  const hash = await writeContract(config, request);
  const receipt = await waitForTransactionReceipt(config, { hash });
  return { hash, receipt };
}

// Utility to read from public state if needed directly
export function getFactoryAddressUnsafe(): Address | undefined {
  return import.meta.env.VITE_FACTORY_ADDRESS as Address | undefined;
}
