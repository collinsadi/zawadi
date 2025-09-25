import type { Address } from "viem";
import {
  readContract,
  simulateContract,
  waitForTransactionReceipt,
  writeContract,
  getPublicClient,
} from "wagmi/actions";
import { parseAbiItem } from "viem";
import { config } from "../config/wagmi";
import escrowAbi from "../abi/escrow.json";

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
      functionName: "organizer",
    }) as Promise<Address>;

  const isLocked = () =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: "isLocked",
    }) as Promise<boolean>;

  const challengeCount = () =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: "challengeCount",
    }) as Promise<bigint>;

  const getChallenge = (challengeId: bigint) =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: "getChallenge",
      args: [challengeId],
    }) as Promise<Challenge>;

  // Public mapping getters
  const challenges = (challengeId: bigint) =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: "challenges",
      args: [challengeId],
    }) as Promise<Challenge>;

  const sponsors = (sponsor: Address) =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: "sponsors",
      args: [sponsor],
    }) as Promise<boolean>;

  const approvals = async (challengeId: bigint): Promise<Approval> => {
    const res = await readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: "approvals",
      args: [challengeId],
    });
    const anyRes: any = res;
    // Contract returns [sponsorApproved, organiserApproved]. Some decoders also add named props.
    const sponsorApproved: boolean = typeof anyRes?.sponsorApproved === 'boolean' ? anyRes.sponsorApproved : !!anyRes?.[0];
    const organiserApproved: boolean = typeof anyRes?.organiserApproved === 'boolean' ? anyRes.organiserApproved : !!anyRes?.[1];
    return { sponsorApproved, organiserApproved };
  };

  // New signature: allocations(address winner, uint256 challengeId) => Allocation
  const allocations = async (winner: Address, challengeId: bigint): Promise<Allocation> => {
    const fn = parseAbiItem("function allocations(address,uint256) view returns (uint256 position, uint256 amount, address winner, bool claimed, uint256 challenge)");
    const res = await readContract(config, {
      abi: [fn],
      address: escrowAddress,
      functionName: "allocations",
      args: [winner, challengeId],
    });
    return res as unknown as Allocation;
  };

  // Direct read: enumerable whitelisted sponsors (if contract supports it)
  const getWhitelistedSponsors = () =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: "getWhitelistedSponsors",
    }) as Promise<Address[]>;

  // Logs-based enumeration of whitelisted sponsors
  const listWhitelistedSponsors = async (): Promise<Address[]> => {
    const publicClient = getPublicClient(config);
    if (!publicClient) return [];
    const event = parseAbiItem("event SponsorWhitelisted(address sponsor)");
    const logs = await publicClient.getLogs({
      address: escrowAddress,
      event,
      fromBlock: 0n,
    });
    const addrs = logs
      .map((l: any) => l?.args?.sponsor as Address)
      .filter(Boolean);
    // Unique, newest first
    const unique = Array.from(new Set(addrs));
    return unique.reverse();
  };

  // Challenges helpers
  type ChallengeWithId = { id: bigint; data: Challenge };

  const getChallengesPage = async (offset: bigint, limit: bigint) =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: "getChallengesPage",
      args: [offset, limit],
    }) as Promise<[Challenge[], bigint[]]>;

  const getChallengeIds = async (): Promise<bigint[]> =>
    readContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: "getChallengeIds",
      args: [],
    }) as Promise<bigint[]>;

  const getAllChallenges = async (): Promise<ChallengeWithId[]> => {
    // Prefer paginated getter
    try {
      console.log('[escrowService] getAllChallenges: using paginated getter');
      const pageSize = 50n;
      let offset = 0n;
      const out: ChallengeWithId[] = [];
      while (true) {
        const [items, ids] = await getChallengesPage(offset, pageSize);
        console.log('[escrowService] page', { offset: offset.toString(), got: ids?.length || 0 });
        if (!ids || ids.length === 0) break;
        for (let i = 0; i < ids.length; i++) {
          out.push({ id: ids[i], data: items[i] });
        }
        if (ids.length < Number(pageSize)) break;
        offset += BigInt(ids.length);
      }
      console.log('[escrowService] total challenges collected (paginated):', out.length);
      return out;
    } catch {
      // Fallback to legacy: challengeCount + logs
      console.warn('[escrowService] getAllChallenges: paginated getter failed, falling back to legacy');
      const seen = new Set<string>();
      const out: ChallengeWithId[] = [];
      const total = await challengeCount().catch(() => 0n);
      console.log('[escrowService] fallback challengeCount:', total.toString());
      const tryIds0 = Array.from({ length: Number(total) }, (_, i) =>
        BigInt(i)
      );
      for (const id of tryIds0) {
        try {
          const data = await getChallenge(id);
          if (data && typeof (data as any).ipfsCid === "string") {
            const key = id.toString();
            if (!seen.has(key)) {
              seen.add(key);
              out.push({ id, data });
            }
          }
        } catch {}
      }
      try {
        const publicClient = getPublicClient(config);
        if (publicClient) {
          const evt = parseAbiItem(
            "event ChallengeAdded(uint256 indexed challengeId, address sponsor, uint256 totalPrize, string ipfsCid)"
          );
          const logs = await publicClient.getLogs({
            address: escrowAddress,
            event: evt,
            fromBlock: 0n,
          });
          console.log('[escrowService] fallback logs ChallengeAdded count:', logs.length);
          for (const l of logs) {
            const id = BigInt(l.args?.challengeId as any);
            const key = id.toString();
            if (seen.has(key)) continue;
            try {
              const data = await getChallenge(id);
              if (data && typeof (data as any).ipfsCid === "string") {
                seen.add(key);
                out.push({ id, data });
              }
            } catch {}
          }
        }
      } catch {}
      out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      console.log('[escrowService] total challenges collected (fallback):', out.length);
      return out;
    }
  };

  const hasWinners = async (challengeId: bigint): Promise<boolean> => {
    try {
      const publicClient = getPublicClient(config);
      if (!publicClient) return false;
      const event = parseAbiItem(
        "event WinnersAdded(uint256 indexed challengeId, address[] winners, uint256[] allocations)"
      );
      const logs = await publicClient.getLogs({
        address: escrowAddress,
        event,
        args: { challengeId },
        fromBlock: 0n,
      });
      return logs.length > 0;
    } catch {
      return false;
    }
  };

  // Writes
  const whitelistSponsor = async (sponsorAddr: Address) => {
    const { request } = await simulateContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: "whitelistSponsor",
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
      functionName: "addChallenge",
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
      functionName: "fundChallenge",
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
      functionName: "addWinners",
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
      functionName: "approveDistribution",
      args: [challengeId],
    });
    const hash = await writeContract(config, request);
    const receipt = await waitForTransactionReceipt(config, { hash });
    return { hash, receipt };
  };

  // Winner claims their allocation payout.
  const claimPayout = async (challengeId: bigint) => {
    const fn = parseAbiItem("function claimPayout(uint256 _challengeId)");
    const { request } = await simulateContract(config, {
      abi: [fn],
      address: escrowAddress,
      functionName: "claimPayout",
      args: [challengeId],
    });
    const hash = await writeContract(config, request);
    const receipt = await waitForTransactionReceipt(config, { hash });
    return { hash, receipt };
  };

  // Convenience helper for connected user
  const allocationsForMe = (winner: Address, challengeId: bigint) => allocations(winner, challengeId);

  // Helper to read token decimals for a challenge (native=18)
  const challengeTokenDecimals = async (challengeId: bigint): Promise<number> => {
    try {
      const dec = await readContract(config, {
        abi: escrowAbi,
        address: escrowAddress,
        functionName: "challengeTokenDecimals",
        args: [challengeId],
      }) as unknown as number | bigint;
      return Number(dec);
    } catch {
      return 18;
    }
  };

  // Winners list by reading WinnersAdded logs for a specific challenge
  const getWinnersForChallenge = async (challengeId: bigint): Promise<Array<{ address: Address; amount: bigint; position: number }>> => {
    try {
      const publicClient = getPublicClient(config);
      if (!publicClient) return [];
      const event = parseAbiItem(
        "event WinnersAdded(uint256 indexed challengeId, address[] winners, uint256[] allocations)"
      );
      const logs = await publicClient.getLogs({
        address: escrowAddress,
        event,
        args: { challengeId },
        fromBlock: 0n,
      });
      if (!logs || logs.length === 0) return [];
      // Use the last WinnersAdded for this challenge as source of truth
      const last = logs[logs.length - 1] as any;
      const winners: Address[] = (last.args?.winners || []) as Address[];
      const allocations: bigint[] = (last.args?.allocations || []) as bigint[];
      const out: Array<{ address: Address; amount: bigint; position: number }> = [];
      for (let i = 0; i < winners.length; i++) {
        out.push({ address: winners[i], amount: allocations[i] || 0n, position: i + 1 });
      }
      return out;
    } catch {
      return [];
    }
  };

  const lockContract = async () => {
    const { request } = await simulateContract(config, {
      abi: escrowAbi,
      address: escrowAddress,
      functionName: "lockContract",
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
      functionName: "unLockContract",
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
    allocationsForMe,
    getWhitelistedSponsors,
    listWhitelistedSponsors,
    getAllChallenges,
    hasWinners,
    // writes
    whitelistSponsor,
    addChallenge,
    fundChallenge,
    addWinners,
    approveDistribution,
    claimPayout,
    challengeTokenDecimals,
    getWinnersForChallenge,
    lockContract,
    unLockContract,
  };
}
