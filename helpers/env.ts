require("dotenv").config();
export const SKIP_LOAD = process.env.SKIP_LOAD === "true";

export const DETERMINISTIC_DEPLOYMENT = process.env.DETERMINISTIC_DEPLOYMENT
  ? process.env.DETERMINISTIC_DEPLOYMENT === "true"
  : null;

export const COMMON_DEPLOY_PARAMS = {
  log: true,
  deterministicDeployment: DETERMINISTIC_DEPLOYMENT ?? false,
};
export const MNEMONIC_PATH = "m/44'/60'/0'/0";
export const MNEMONIC = process.env.MNEMONIC || "";
export const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
