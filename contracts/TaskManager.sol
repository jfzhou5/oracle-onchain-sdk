// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/ITaskManager.sol";

contract TaskManager is Initializable, OwnableUpgradeable, ITaskManager {
    address public oracle;
    mapping(address => bool) public submitters;
    mapping(bytes32 => Task) public tasks;

    event AddSubmitter(address indexed submitter);
    event RemoveSubmitter(address indexed submitter);
    event SubmitTask(address indexed submitter, bytes32 indexed taskHash);
    event CancelTask(address indexed submitter, bytes32 indexed taskHash);
    event VerifyTaskResult(bytes32 indexed taskHash);

    constructor() {
        _disableInitializers();
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not from oracle");
        _;
    }

    modifier onlySubmitter() {
        require(submitters[msg.sender], "Not from submitter");
        _;
    }

    function initialize() external initializer {
        __Ownable_init(msg.sender);
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    function addSubmitter(address submitter) external onlyOwner {
        submitters[submitter] = true;
        emit AddSubmitter(submitter);
    }

    function removeSubmitter(address submitter) external onlyOwner {
        submitters[submitter] = false;
        emit RemoveSubmitter(submitter);
    }

    function getTaskHash(
        address submitter,
        TaskType taskType,
        bytes memory input
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(TASK_HASH, submitter, taskType, input));
    }

    function submitTask(
        TaskType taskType,
        bytes memory input
    ) external onlySubmitter returns (bytes32) {
        address submitter = msg.sender;

        bytes32 taskHash = getTaskHash(submitter, taskType, input);

        require(tasks[taskHash].submitter == address(0), "task exist");

        tasks[taskHash] = Task({
            submitter: submitter,
            taskType: taskType,
            input: input,
            output: "",
            isVerified: false
        });

        emit SubmitTask(submitter, taskHash);

        return taskHash;
    }

    function cancelTask(
        bytes32 taskHash
    ) external onlySubmitter returns (bytes32) {
        address submitter = msg.sender;

        Task memory task = tasks[taskHash];

        require(task.submitter == submitter, "Invalid task hash");
        require(task.isVerified == false, "task has been verified");

        delete tasks[taskHash];

        emit CancelTask(submitter, taskHash);

        return taskHash;
    }

    function verifyTask(
        bytes32 taskHash,
        bytes memory output
    ) external onlyOracle {
        Task storage task = tasks[taskHash];
        require(task.isVerified == false, "task has been verified");
        task.output = output;
        task.isVerified = true;
        emit VerifyTaskResult(taskHash);
    }

    function reSubmitTask(bytes32 taskHash) external onlyOracle {
        Task memory task = tasks[taskHash];
        require(task.isVerified == false, "task has been verified");
        emit SubmitTask(task.submitter, taskHash);
    }
}
