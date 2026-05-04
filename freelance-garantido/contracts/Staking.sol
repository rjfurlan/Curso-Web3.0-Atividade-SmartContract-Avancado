// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Staking is ReentrancyGuard {
    IERC20 public token;
    address public dao;

    mapping(address => uint256) public stakes;
    mapping(address => uint256) public locked;

    modifier onlyDAO() {
        require(msg.sender == dao, "Not DAO");
        _;
    }

    constructor(address _token) {
        token = IERC20(_token);
    }

    function setDAO(address _dao) external {
        require(dao == address(0), "Already set");
        dao = _dao;
    }

    // Stake livre
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Invalid amount");

        token.transferFrom(msg.sender, address(this), amount);
        stakes[msg.sender] += amount;
    }


    // Unstake (somente livre)
    function unstake(uint256 amount) external nonReentrant {
        require(stakes[msg.sender] >= amount, "Not enough");

        stakes[msg.sender] -= amount;
        token.transfer(msg.sender, amount);
    }

    // Lock (DAO)
    function lock(address user, uint256 amount) external onlyDAO {
        require(stakes[user] >= amount, "Not enough stake");

        stakes[user] -= amount;
        locked[user] += amount;
    }

    // Unlock (DAO)
    function unlock(address user, uint256 amount) external onlyDAO {
        require(locked[user] >= amount, "Not enough locked");

        locked[user] -= amount;
        stakes[user] += amount;
    }


    // Slash (DAO)
    function slash(address user, uint256 amount) external onlyDAO {
        require(locked[user] >= amount, "Not enough locked");

        locked[user] -= amount;

    }

    // Rewaesd (DAO)
    function reward(address user, uint256 amount) external onlyDAO {
        token.transfer(user, amount);
    }
}
