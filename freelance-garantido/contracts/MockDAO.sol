// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockDAO {
    event CaseOpened(uint256 jobId, uint256 guarantee);

    function openCase(uint256 jobId, uint256 guarantee) external {
        emit CaseOpened(jobId, guarantee);
    }
}
