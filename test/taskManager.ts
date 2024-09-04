import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import {
  TaskManager,
  TaskManager__factory,
  TaskOracle,
  TaskOracle__factory,
} from "../typechain";
import { TaskType } from "../helpers/configs";

describe("Test Task Manager and Task Oracle", function () {
  async function deploy() {
    const [owner, submitter, verifierOne, verifierTwo, verifierThree] =
      await hre.ethers.getSigners();

    const TaskManager = await hre.ethers.getContractFactory("TaskManager");
    const TaskManagerImplDeployment = await TaskManager.deploy();
    const taskManagerInitData =
      TaskManager__factory.createInterface().encodeFunctionData("initialize");

    const Proxy = await hre.ethers.getContractFactory(
      "TransparentUpgradeableProxy"
    );
    const TaskManagerProxyDeployment = await Proxy.deploy(
      await TaskManagerImplDeployment.getAddress(),
      owner.address,
      taskManagerInitData
    );
    let taskManager = TaskManager__factory.connect(
      await TaskManagerProxyDeployment.getAddress(),
      owner
    ) as TaskManager;
    const TaskOracle = await hre.ethers.getContractFactory("TaskOracle");
    const TaskOracleImplDeployment = await TaskOracle.deploy();
    const taskOracleInitData =
      TaskOracle__factory.createInterface().encodeFunctionData("initialize", [
        await taskManager.getAddress(),
      ]);

    const TaskOracleProxyDeployment = await Proxy.deploy(
      await TaskOracleImplDeployment.getAddress(),
      owner.address,
      taskOracleInitData
    );
    const taskOracle = TaskOracle__factory.connect(
      await TaskOracleProxyDeployment.getAddress(),
      owner
    ) as TaskOracle;

    await taskManager.setOracle(await taskOracle.getAddress());
    await taskManager.addSubmitter(submitter.address);
    taskManager = taskManager.connect(submitter);

    await taskOracle.addVerifier(verifierOne.address);
    await taskOracle.addVerifier(verifierTwo.address);
    await taskOracle.addVerifier(verifierThree.address);
    await taskOracle.setVerifyThreshold(3);

    return {
      taskManager,
      taskOracle,
      submitter,
      verifierOne,
      verifierTwo,
      verifierThree,
    };
  }

  it("Basic check", async () => {
    const {
      taskManager,
      taskOracle,
      submitter,
      verifierOne,
      verifierTwo,
      verifierThree,
    } = await loadFixture(deploy);

    expect(await taskManager.oracle()).to.be.eq(await taskOracle.getAddress());
    expect(await taskManager.submitters(submitter.address)).to.be.true;
    expect(await taskOracle.taskManager()).to.be.eq(
      await taskManager.getAddress()
    );
    expect(await taskOracle.verifiers(verifierOne.address)).to.be.true;
    expect(await taskOracle.verifiers(verifierTwo.address)).to.be.true;
    expect(await taskOracle.verifiers(verifierThree.address)).to.be.true;
  });

  it("Integration Test", async () => {
    const {
      taskManager,
      taskOracle,
      submitter,
      verifierOne,
      verifierTwo,
      verifierThree,
    } = await loadFixture(deploy);

    // Task: fetch Ton token price from pyth
    const url =
      "https://hermes.pyth.network/v2/updates/price/latest?ids[]=8963217838ab4cf5cadc172203c1f0b763fbaa45f346d8ee50ba994bbcac3026";
    const hash = await taskManager.getTaskHash(
      submitter.address,
      TaskType.HTTP_CALL,
      ethers.toUtf8Bytes(url)
    );
    // submitTask function emit the  `SubmitTask` event
    await expect(
      taskManager.submitTask(TaskType.HTTP_CALL, ethers.toUtf8Bytes(url))
    )
      .to.emit(taskManager, "SubmitTask")
      .withArgs(submitter.address, hash);
    const task = await taskManager.tasks(hash);
    expect(task.submitter).to.be.eq(submitter.address);
    expect(ethers.toUtf8String(task.input)).to.eq(url);

    // verifierOne subscribes the `SubmitTask` event of taskManager
    // and parse the input according to the taskType
    // and handle the request offline
    const taskUrl = ethers.toUtf8String(task.input);
    const result = (await (await fetch(taskUrl)).json()).parsed[0].price.price;
    // verifierOne submits the result to oracle, and wait for the other verifiers to verify
    await expect(
      taskOracle
        .connect(verifierOne)
        .verifyTask(hash, ethers.toUtf8Bytes(result), true)
    )
      .to.emit(taskOracle, "VerifyTask")
      .withArgs(hash, verifierOne.address, true);

    // All verifiers subscribe the `SubmitTask` event of taskManager and `VerifyTask` event of taskOracle in the same time
    // once the result of one task has been submitted to the oracle, other verifiers stop the calculation for the same task,
    // and start to verify the submiited result
    const taskResult = await taskOracle.taskResults(hash);
    // const taskInfo = await taskManager.tasks(hash)
    // const taskUrl = ethers.toUtf8String(task.input);
    const resultTwo = (await (await fetch(taskUrl)).json()).parsed[0].price
      .price;

    // verifierTwo check the onchain result
    if (
      Math.abs(Number(ethers.toUtf8String(taskResult.output)) - resultTwo) /
        resultTwo <
      0.01
    ) {
      // verifierTwo verify the onchain result as success
      await expect(
        taskOracle
          .connect(verifierTwo)
          .verifyTask(hash, taskResult.output, true)
      )
        .to.emit(taskOracle, "VerifyTask")
        .withArgs(hash, verifierTwo.address, true);
      console.log("verifierTwo pass");
    }

    // verifierThree check the onchain result
    const resultThree = (await (await fetch(taskUrl)).json()).parsed[0].price
      .price;
    if (
      Math.abs(Number(ethers.toUtf8String(taskResult.output)) - resultThree) /
        resultThree <
      0.01
    ) {
      // verifierThree verify the onchain result as success
      await expect(
        taskOracle
          .connect(verifierThree)
          .verifyTask(hash, taskResult.output, true)
      )
        .to.emit(taskOracle, "VerifyTask")
        .withArgs(hash, verifierThree.address, true)
        // verify success and submit the result from oracle to taskManager
        .to.emit(taskManager, "VerifyTaskResult")
        .withArgs(hash);
      console.log("verifierThree pass");
    }

    const finalTask = await taskManager.tasks(hash);
    console.log(Number(ethers.toUtf8String(finalTask.output)));
  });
});
