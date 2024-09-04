// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/ITaskManager.sol";

struct TaskResult {
    bytes output;
    uint32 success;
    uint32 fail;
}

contract TaskOracle is Initializable, OwnableUpgradeable {
    ITaskManager public taskManager;

    mapping(bytes32 => TaskResult) public taskResults;
    mapping(address => bool) public verifiers;

    uint32 public verifyThreshold = 3;

    event AddVerifier(address indexed verifier);
    event RemoveVerifier(address indexed verifier);
    event ReSubmitTask(bytes32 indexed taskHash);
    event VerifyTask(
        bytes32 indexed taskHash,
        address indexed verifier,
        bool isSuccess
    );

    constructor() {
        _disableInitializers();
    }

    modifier onlyVerifier() {
        require(verifiers[msg.sender], "Not from verifier");
        _;
    }

    function initialize(ITaskManager _taskManager) external initializer {
        __Ownable_init(msg.sender);
        taskManager = _taskManager;
    }

    function setVerifyThreshold(uint32 _verifyThreshold) external onlyOwner {
        verifyThreshold = _verifyThreshold;
    }

    function addVerifier(address verifier) external onlyOwner {
        verifiers[verifier] = true;
        emit AddVerifier(verifier);
    }

    function removeVerifier(address verifier) external onlyOwner {
        verifiers[verifier] = false;
        emit RemoveVerifier(verifier);
    }

    function verifyTask(
        bytes32 taskHash,
        bytes calldata output,
        bool isSuccess
    ) external onlyVerifier {
        TaskResult storage task = taskResults[taskHash];
        if (task.output.length != 0) {
            require(
                keccak256(task.output) == keccak256(output),
                "different output"
            );
            if (isSuccess) {
                task.success += 1;
            } else {
                task.fail += 1;
            }
        } else {
            task.output = output;
            task.success += 1;
        }

        if (task.success >= verifyThreshold) {
            taskManager.verifyTask(taskHash, task.output);
        } else if (task.fail >= verifyThreshold) {
            delete taskResults[taskHash];
            taskManager.reSubmitTask(taskHash);
            emit ReSubmitTask(taskHash);
        }
        emit VerifyTask(taskHash, msg.sender, isSuccess);
    }
}
