import { Contract, WebSocketProvider } from "ethers";
import { ENVIRONMENT } from "../../common/config/environment";
import logger from "../../common/resources/logger";

// Minimal ABI containing only the HackathonCreated event
const FACTORY_MINIMAL_ABI = [
  "event HackathonCreated(bytes32 indexed hackathonId, address indexed organizer, address escrowContract, string ipfsCid)"
];

let provider: WebSocketProvider | null = null;
let factoryContract: Contract | null = null;
let listenerAttached = false;

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

    // Add WebSocket connection event handlers using provider events
    provider.on('connect', () => {
      logger.info('WebSocket connection opened', { websocketUrl });
    });

    provider.on('error', (error: Error) => {
      logger.error('WebSocket connection error', { error: error.message, websocketUrl });
    });

    provider.on('disconnect', (error?: Error) => {
      logger.warn('WebSocket connection closed', { 
        error: error?.message, 
        websocketUrl 
      });
      listenerAttached = false;
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
  
  if (provider) {
    provider.removeAllListeners();
    provider.destroy();
    provider = null;
    logger.info("WebSocket connection closed");
  }
}


