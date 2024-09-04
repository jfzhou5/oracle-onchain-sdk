// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// we can define some task types onchain
// and define the Task request struct and response struct offchain of each type
enum TaskType {
    None,
    // for http_call: 
    //      request: [url, ...params]
    //      response: [...results]
    HTTP_CALL 
    // ...
}

//keccak256("Task(address submitter,uint8 taskType,bytes input)");
bytes32 constant TASK_HASH = 0x4a7c6285e1404444fc9f41ef26aa4a737ac479a08eccbcdae04709c9e381dc9f;

struct Task {
    address submitter;
    TaskType taskType;
    bytes input;
    bytes output;
    bool isVerified;
}

interface ITaskManager {
    function verifyTask(bytes32 taskHash, bytes memory output) external;

    function reSubmitTask(bytes32 taskHash) external;
}
