# Onchain oracle sdk

## Objective

Create a suite of smart contracts to bridge on-chain activities with off-chain compute workloads, leveraging Ethereum and Solidity. This involves managing subscriptions, encoding and decoding data for compute tasks, and ensuring secure, efficient communication between the blockchain and external compute resources.

## Key Components

- **Smart Contracts**: Implement contracts for job specification, subscription management, and result verification, using Solidity.
- **Event-Driven Communication**: Use Ethereum events to initiate off-chain compute tasks, with event listeners on the off-chain side to trigger processing.
- **Custom Oracles**: Develop oracles for validating off-chain computation results before they are accepted on-chain, incorporating cryptographic proofs.
- **Data Encoding/Decoding**: Define standard formats for job requests and results, ensuring smart contracts can dynamically handle these.
- **Gas Optimization & Fallback Mechanisms**: Optimize for gas efficiency and implement fallbacks for off-chain compute failures.

## Contracts

### TaskManager

manage the submitters and create/cancel/verify tasks.

- `submitTask` function: The submitter submits the Task with pre-defined request struct like `contracts/interfaces/ITaskManager.sol`. And this function will emit `SubmitTask` event, and verifiers will subscribe this event and parse the input and then submit/verify the offchain result.
- `cancelTask` function: The submitter can cancel the task before the oracle verify and submit the output of this task.
- `verifyTask` function: `onlyOracle`: After the TaskOracle verified the result submitted by verifiers from offchain successfully, TaskOracle will call this function to submit the verified result onchain.
- `reSubmitTask` function: once the submitted result in the oracle is failed to verified, the task will be resubmitted again and emit `SubmitTask` event again and the the task will be handled again by verifiers.

### TaskOracle

manage the verifiers and try to verify the result of task

- `verifyTask` function: `onlyVerifier`: All verifiers subscribe the `SubmitTask` event of taskManager and `VerifyTask` event of taskOracle in the same time, Once the result of one task has been submitted to the oracle, other verifiers stop the calculation for the same task, And start to verify the submiited result. And if the count of verifer who verify success reached the verify threshold, the result will be submitted to `TaskManager`.

Another plan for the verification: all verifier can handle the task and verify the result on the offchain service and only submit the result to oracle with their signatures.

## Flow chart
![alt text](</sources/flow.png>)