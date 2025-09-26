import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
// import { sepolia } from "../chains/hardhat";

export const config = getDefaultConfig({
  appName: "Zawadi",
  projectId: "81a9762e7ae04a1d2e6bd68b13403653",
  chains: [sepolia],
  ssr: true,
});
