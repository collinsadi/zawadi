import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FACTORY_INTENT_SPEC_URI =
  "ipfs://bafkreien73zbuddiil35eittxcs6hab3mmkwezdsmotv626mochcp2jy7u";
const ESCROW_INTENT_SPEC_URI =
  "ipfs://bafkreibhckuqsghlxyqkr3bczankfpcj4hmrlrb6h567vqda7zy7bbtq3e";

export default buildModule("FactoryModule", (m) => {
  const factoryURI = m.getParameter("factoryURI", FACTORY_INTENT_SPEC_URI);
  const escrowURI = m.getParameter("escrowURI", ESCROW_INTENT_SPEC_URI);

  const factory = m.contract("Factory", [factoryURI, escrowURI]);

  return { factory };
});
