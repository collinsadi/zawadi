import type { Address } from 'viem';
import { readContract, simulateContract, waitForTransactionReceipt, writeContract, getPublicClient } from 'wagmi/actions';
import { config } from '../config/wagmi';
import escrowAbi from '../abi/escrow.json';

// Types aligned with EscrowLib structs (approximate based on Solidity)
export type Challenge = {
  totalPrize: bigint;
  sponsor: Address;
  isPaidOut: boolean;
  token: Address;
  isERC20: boolean;
  ipfsCid: string;
  isFunded: boolean;
};

export type Allocation = {
  position: bigint; // 1-based
  amount: bigint;
  winner: Address;
  claimed: boolean;
  challenge: bigint; // challengeId
};

export type Approval = {
  sponsorApproved: boolean;
  organiserApproved: boolean;
};

export function createEscrowService(address: Address) {
  const escrowAddress = address;

  // Reads
  const organizer = () =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'organizer',
    }) as Promise<Address>;

  const isLocked = () =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'isLocked',
    }) as Promise<boolean>;

  const challengeCount = () =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'challengeCount',
    }) as Promise<bigint>;

  const getChallenge = (challengeId: bigint) =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'getChallenge',
      args: [challengeId],
    }) as Promise<Challenge>;

  // Public mapping getters
  const challenges = (challengeId: bigint) =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'challenges',
      args: [challengeId],
    }) as Promise<Challenge>;

  const sponsors = (sponsor: Address) =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'sponsors',
      args: [sponsor],
    }) as Promise<boolean>;

  const approvals = (challengeId: bigint) =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'approvals',
      args: [challengeId],
    }) as Promise<Approval>;

  const allocations = (winner: Address) =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'allocations',
      args: [winner],
    }) as Promise<Allocation>;

  // Logs-based enumeration of whitelisted sponsors
  const listWhitelistedSponsors = async (): Promise<Address[]> => {
    const publicClient = getPublicClient(config);
    const logs = await publicClient.getLogs({
      address: escrowAddress,
      abi: escrowAbi as any,
      eventName: 'SponsorWhitelisted',
      fromBlock: 0n,
    });
    const addrs = logs
      .map((l: any) => l?.args?.sponsor as Address)
      .filter(Boolean);
    // Unique, newest first
    const unique = Array.from(new Set(addrs));
    return unique.reverse();
  };

  // Writes
  const whitelistSponsor = async (sponsorAddr: Address) => {
    const { request } = await simulateContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'whitelistSponsor',
      args: [sponsorAddr],
    });
    const hash = await writeContract(config, request);
    const receipt = await waitForTransactionReceipt(config, { hash });
    return { hash, receipt };
  };

  const addChallenge = async (
    totalPrize: bigint,
    token: Address,
    isERC20: boolean,
    ipfsCid: string
  ) => {
    const { request } = await simulateContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'addChallenge',
      args: [totalPrize, token, isERC20, ipfsCid],
    });
    const hash = await writeContract(config, request);
    const receipt = await waitForTransactionReceipt(config, { hash });
    return { hash, receipt };
  };

  // For native ETH funding, pass value equal to totalPrize. For ERC20, value should be 0n.
  const fundChallenge = async (challengeId: bigint, value?: bigint) => {
    const { request } = await simulateContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'fundChallenge',
      args: [challengeId],
      // viem/wagmi supports specifying value in simulate/write for payable fns
      value,
    });
    const hash = await writeContract(config, request);
    const receipt = await waitForTransactionReceipt(config, { hash });
    return { hash, receipt };
  };

  const addWinners = async (
    challengeId: bigint,
    winners: Address[],
    amounts: bigint[]
  ) => {
    const { request } = await simulateContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'addWinners',
      args: [challengeId, winners, amounts],
    });
    const hash = await writeContract(config, request);
    const receipt = await waitForTransactionReceipt(config, { hash });
    return { hash, receipt };
  };

  const approveDistribution = async (challengeId: bigint) => {
    const { request } = await simulateContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'approveDistribution',
      args: [challengeId],
    });
    const hash = await writeContract(config, request);
    const receipt = await waitForTransactionReceipt(config, { hash });
    return { hash, receipt };
  };

  const lockContract = async () => {
    const { request } = await simulateContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'lockContract',
      args: [],
    });
    const hash = await writeContract(config, request);
    const receipt = await waitForTransactionReceipt(config, { hash });
    return { hash, receipt };
  };

  const unLockContract = async () => {
    const { request } = await simulateContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: 'unLockContract',
      args: [],
    });
    const hash = await writeContract(config, request);
    const receipt = await waitForTransactionReceipt(config, { hash });
    return { hash, receipt };
  };

  return {
    // address
    address: escrowAddress,
    // reads
    organizer,
    isLocked,
    challengeCount,
    getChallenge,
    challenges,
    sponsors,
    approvals,
    allocations,
    listWhitelistedSponsors,
    // writes
    whitelistSponsor,
    addChallenge,
    fundChallenge,
    addWinners,
    approveDistribution,
    lockContract,
    unLockContract,
  };
}
