// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockContractNFT {
    uint256 public nftCount;

    function mint(address, uint256, uint8) external returns (uint256) {
        uint256 ret = nftCount;
        nftCount++;
        return ret;
    }
}
