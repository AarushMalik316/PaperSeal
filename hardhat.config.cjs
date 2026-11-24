// Hardhat config (CommonJS because package.json uses "type": "module").
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const path = require("path");
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

const SOLC_VERSION = "0.8.24";

// Compile with the pinned `solc` npm package (solcjs, WebAssembly) instead of
// downloading a native compiler. This keeps builds reproducible and lets the
// project compile offline or behind restrictive networks.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, _hre, runSuper) => {
  if (args.solcVersion === SOLC_VERSION) {
    const solc = require("solc");
    return {
      compilerPath: path.join(path.dirname(require.resolve("solc")), "soljson.js"),
      isSolcJs: true,
      version: SOLC_VERSION,
      longVersion: solc.version(),
    };
  }
  return runSuper();
});

const { BASE_SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, BASESCAN_API_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: SOLC_VERSION,
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // Set HARDHAT_MINE_FAILED_TX=1 when running `npm run chain:local` to make the
      // local node mine reverted transactions (status 0) like Base Sepolia does,
      // instead of rejecting them at submission.
      throwOnTransactionFailures: !process.env.HARDHAT_MINE_FAILED_TX,
    },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      // Optional CLI deploy only. Use a throwaway TESTNET-ONLY key kept in your
      // local, git-ignored .env. The recommended path needs no key at all:
      // deploy from the PaperSeal setup panel with MetaMask (see README).
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: BASESCAN_API_KEY || "",
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: { apiURL: "https://api-sepolia.basescan.org/api", browserURL: "https://sepolia.basescan.org" },
      },
    ],
  },
  sourcify: { enabled: false },
  paths: { sources: "./contracts", tests: "./test", artifacts: "./artifacts", cache: "./cache" },
};
