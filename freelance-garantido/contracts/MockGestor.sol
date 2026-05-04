// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDAO {
    function openCase(uint256 jobId, uint256 guarantee) external;
}

contract MockGestor {
    event Resolved(uint256 jobId, bool clientWins);

    function resolveFromDAO(uint256 jobId, bool clientWins) external {
        emit Resolved(jobId, clientWins);
    }

    function openCase(address dao, uint256 jobId, uint256 guarantee) external {
        IDAO(dao).openCase(jobId, guarantee);
    }
}
