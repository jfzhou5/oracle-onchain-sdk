import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import { loadTasks } from "./helpers/utils";
import { MNEMONIC, MNEMONIC_PATH, PRIVATE_KEY, SKIP_LOAD } from "./helpers/env";

// Prevent to load tasks before compilation and typechain
if (!SKIP_LOAD) {
  loadTasks(["deploy", "misc"]); // load task folders
}

const accounts =
  (PRIVATE_KEY && { accounts: [PRIVATE_KEY] }) ||
  (MNEMONIC && {
    accounts: {
      mnemonic: MNEMONIC,
      path: MNEMONIC_PATH,
      initialIndex: 0,
      count: 10,
    },
  });

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: { enabled: true, runs: 100_000 },
        },
      },
    ],
  },
  networks: {
    sepolia: {
      url: "https://sepolia.drpc.org",
      ...accounts,
    },
  },
  typechain: {
    outDir: "typechain",
  },
};

export default config;
