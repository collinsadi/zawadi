import { Contract, WebSocketProvider } from "ethers";
import { ENVIRONMENT } from "../../common/config/environment";
import logger from "../../common/resources/logger";
import { Hackathon } from "../../models/Hackathon";

// Minimal ABI containing only the HackathonCreated event
const FACTORY_MINIMAL_ABI = [
  "event HackathonCreated(bytes32 indexed hackathonId, address indexed organizer, address escrowContract, string ipfsCid)"
];

// Minimal ABI for Escrow contract events
const ESCROW_MINIMAL_ABI = [
  "event ChallengeAdded(uint256 indexed challengeId, address sponsor, uint256 totalPrize, string ipfsCid)",
  "event ChallengeFunded(uint256 indexed challengeId, address sponsor, uint256 amount)",
  "event WinnersAdded(uint256 indexed challengeId, address[] winners, uint256[] allocations)",
  "event DistributionApproved(uint256 indexed challengeId, address approver)",
  "event PrizeClaimed(uint256 indexed challengeId, address winner, uint256 amount)",
  "event ConfigurationLocked()",
  "event ConfigurationUnLocked()",
  "event SponsorWhitelisted(address sponsor)"
];

let provider: WebSocketProvider | null = null;
let factoryContract: Contract | null = null;
let listenerAttached = false;

// Track attached escrow listeners per address to avoid duplicates
const escrowContracts: Record<string, Contract> = {};
const escrowListeners = new Set<string>();

function normalizeAddress(address: string): string {
  return (address || "").trim().toLowerCase();
}

export function startFactoryEventListener() {
  if (listenerAttached) return; // prevent duplicate listeners in dev/watch

  const wsUrl = ENVIRONMENT.BLOCKCHAIN.WS_URL || ENVIRONMENT.BLOCKCHAIN.RPC_URL;
  const chainId = ENVIRONMENT.BLOCKCHAIN.CHAIN_ID;
  const contractAddress = ENVIRONMENT.BLOCKCHAIN.CONTRACT_ADDRESS;

  if (!wsUrl || !contractAddress) {
    logger.warn("Blockchain listener not started: WS_URL/RPC_URL or CONTRACT_ADDRESS missing", {
      wsUrlPresent: Boolean(wsUrl),
      contractAddressPresent: Boolean(contractAddress)
    });
    return;
  }

  // Convert HTTP RPC URL to WebSocket URL if needed
  const websocketUrl = wsUrl.replace(/^https?:\/\//, 'ws://').replace(/^http:\/\//, 'ws://');
  
  try {
    provider = new WebSocketProvider(websocketUrl, chainId);
    factoryContract = new Contract(contractAddress, FACTORY_MINIMAL_ABI, provider);

    // Ethers v6 Provider events: use 'network' and 'block'
    provider.on('network', (network, oldNetwork) => {
      if (oldNetwork) {
        logger.info('WebSocket network changed', { from: oldNetwork.chainId, to: network.chainId, websocketUrl });
      } else {
        logger.info('WebSocket network connected', { chainId: network.chainId, websocketUrl });
      }
    });

    // Optionally log blocks to confirm liveness (throttled by default provider)
    provider.on('block', (blockNumber: number) => {
      // Keep lightweight to avoid noisy logs
      if (blockNumber % 100 === 0) {
        logger.info('WebSocket new block', { blockNumber });
      }
    });

    factoryContract.on(
      "HackathonCreated",
      (hackathonId: string, organizer: string, escrowContract: string, ipfsCid: string) => {
        logger.info("HackathonCreated event received", {
          hackathonId,
          organizer,
          escrowContract,
          ipfsCid
        });

        // Start listening to the emitted escrow contract automatically
        if (escrowContract) {
          try {
            startEscrowEventListener(escrowContract);
          } catch (e) {
            logger.warn("Failed to attach escrow listener from HackathonCreated", {
              escrowContract,
              error: e instanceof Error ? e.message : String(e)
            });
          }
        }
      }
    );

    listenerAttached = true;
    logger.info("Factory event listener attached", { contractAddress, websocketUrl, chainId });
  } catch (error) {
    logger.error("Failed to start WebSocket event listener", {
      error: error instanceof Error ? error.message : String(error),
      websocketUrl,
      contractAddress
    });
  }
}

export function stopFactoryEventListener() {
  if (factoryContract && listenerAttached) {
    factoryContract.removeAllListeners("HackathonCreated");
    listenerAttached = false;
    logger.info("Factory event listener removed");
  }
  
  // Remove all escrow listeners
  for (const [address, contract] of Object.entries(escrowContracts)) {
    try {
      contract.removeAllListeners();
      logger.info("Escrow event listeners removed", { address });
    } catch (e) {
      logger.warn("Failed to remove listeners for escrow", { address, error: e instanceof Error ? e.message : String(e) });
    }
    delete escrowContracts[address];
    escrowListeners.delete(address.toLowerCase());
  }

  if (provider) {
    provider.removeAllListeners();
    provider.destroy();
    provider = null;
    logger.info("WebSocket connection closed");
  }
}

// Start listening to events from a specific Escrow contract address
export function startEscrowEventListener(escrowAddress: string) {
  const address = (escrowAddress || "").trim();
  if (!address) {
    logger.warn("Escrow listener not started: escrowAddress missing");
    return;
  }

  const key = normalizeAddress(address);
  if (escrowListeners.has(key)) {
    return; // already attached
  }

  // Ensure provider exists; if not, try to initialize via factory starter
  if (!provider) {
    try {
      startFactoryEventListener();
    } catch {
      // ignore
    }
  }

  if (!provider) {
    logger.warn("Escrow listener not started: provider not initialized");
    return;
  }

  const escrow = new Contract(address, ESCROW_MINIMAL_ABI, provider);

  // Attach listeners for all relevant escrow events
  escrow.on("ChallengeAdded", (challengeId: bigint, sponsor: string, totalPrize: bigint, ipfsCid: string) => {
    logger.info("Escrow::ChallengeAdded", { escrowAddress: address, challengeId: challengeId.toString(), sponsor, totalPrize: totalPrize.toString(), ipfsCid });
  });

  escrow.on("ChallengeFunded", (challengeId: bigint, sponsor: string, amount: bigint) => {
    logger.info("Escrow::ChallengeFunded", { escrowAddress: address, challengeId: challengeId.toString(), sponsor, amount: amount.toString() });
  });

  escrow.on("WinnersAdded", (challengeId: bigint, winners: string[], allocations: bigint[]) => {
    logger.info("Escrow::WinnersAdded", { escrowAddress: address, challengeId: challengeId.toString(), winners, allocations: allocations.map(a => a.toString()) });
  });

  escrow.on("DistributionApproved", (challengeId: bigint, approver: string) => {
    logger.info("Escrow::DistributionApproved", { escrowAddress: address, challengeId: challengeId.toString(), approver });
  });

  escrow.on("PrizeClaimed", (challengeId: bigint, winner: string, amount: bigint) => {
    logger.info("Escrow::PrizeClaimed", { escrowAddress: address, challengeId: challengeId.toString(), winner, amount: amount.toString() });
  });

  escrow.on("ConfigurationLocked", () => {
    logger.info("Escrow::ConfigurationLocked", { escrowAddress: address });
  });

  escrow.on("ConfigurationUnLocked", () => {
    logger.info("Escrow::ConfigurationUnLocked", { escrowAddress: address });
  });

  escrow.on("SponsorWhitelisted", (sponsor: string) => {
    logger.info("Escrow::SponsorWhitelisted", { escrowAddress: address, sponsor });
  });

  escrowContracts[key] = escrow;
  escrowListeners.add(key);
  logger.info("Escrow event listener attached", { escrowAddress: address });
}

// Stop listening to a specific escrow address. If no address provided, remove all escrow listeners
export function stopEscrowEventListener(escrowAddress?: string) {
  if (!escrowAddress) {
    for (const [address, contract] of Object.entries(escrowContracts)) {
      contract.removeAllListeners();
      delete escrowContracts[address];
      escrowListeners.delete(normalizeAddress(address));
      logger.info("Escrow event listeners removed", { address });
    }
    return;
  }

  const key = normalizeAddress(escrowAddress);
  const contract = escrowContracts[key];
  if (contract) {
    contract.removeAllListeners();
    delete escrowContracts[key];
    escrowListeners.delete(key);
    logger.info("Escrow event listeners removed", { address: escrowAddress });
  }
}

// Load all hackathons from DB and attach escrow listeners for each
export async function startEscrowEventListenersFromDB() {
  try {
    const hacks = await Hackathon.find({}, { escrowContract: 1 }).lean();
    const addresses = (hacks || []).map(h => String(h.escrowContract)).filter(Boolean);
    if (!addresses.length) {
      logger.info("No hackathons found to attach escrow listeners to");
      return;
    }
    for (const addr of addresses) {
      startEscrowEventListener(addr);
    }
    logger.info("Escrow listeners initialized from DB", { count: addresses.length });
  } catch (e) {
    logger.error("Failed to initialize escrow listeners from DB", { error: e instanceof Error ? e.message : String(e) });
  }
}

// Reconcile listeners with DB: add new, remove stale
export async function restartEscrowEventListenersFromDB() {
  try {
    const hacks = await Hackathon.find({}, { escrowContract: 1 }).lean();
    const desired = new Set((hacks || []).map(h => normalizeAddress(String(h.escrowContract))));

    // Add missing
    desired.forEach((addr) => {
      if (!escrowListeners.has(addr)) {
        startEscrowEventListener(addr);
      }
    });

    // Remove stale
    escrowListeners.forEach((current) => {
      if (!desired.has(current)) {
        stopEscrowEventListener(current);
      }
    });

    logger.info("Escrow listeners reconciled with DB", { total: escrowListeners.size });
  } catch (e) {
    logger.error("Failed to restart escrow listeners from DB", { error: e instanceof Error ? e.message : String(e) });
  }
}

// Convenience: push a single address into listeners set (e.g., after creating a new hackathon)
export function pushEscrowAddress(address: string) {
  startEscrowEventListener(address);
}


