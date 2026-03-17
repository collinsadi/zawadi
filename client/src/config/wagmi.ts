import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { optimism } from "wagmi/chains";
// import { sepolia } from "wagmi/chains";


export const config = getDefaultConfig({
  appName: "Zawadi",
  projectId: "81a9762e7ae04a1d2e6bd68b13403653",
  chains: [optimism],
  // chains: [optimism, sepolia],
  ssr: true,
});
