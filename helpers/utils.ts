import { ContractTransactionResponse } from "ethers";
import fs from "fs";
import path from "path";

export const loadTasks = (taskFolders: string[]): void =>
  taskFolders.forEach((folder) => {
    const tasksPath = path.join(__dirname, "../tasks", folder);
    fs.readdirSync(tasksPath)
      .filter((pth) => pth.includes(".ts") || pth.includes(".js"))
      .forEach((task) => {
        require(`${tasksPath}/${task}`);
      });
  });

export const waitForTx = async (tx: ContractTransactionResponse) =>
  await tx.wait(1);

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
