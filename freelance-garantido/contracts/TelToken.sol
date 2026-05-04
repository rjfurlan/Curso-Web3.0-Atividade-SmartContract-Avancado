// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TelToken is ERC20, Ownable {
    constructor() 
        ERC20("Freelance Token", "TEL") 
        Ownable(msg.sender) 
    {
        // NÃO mintar supply inicial
        // Quando se quer criar TOKENS ao iniciar _mint(msg.sender, 1_000_000 * 1e18);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
