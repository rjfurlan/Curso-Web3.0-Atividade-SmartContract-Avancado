// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./TelToken.sol";

contract TokenSale is Ownable, ReentrancyGuard {    
    uint256  public rate = 1000000; // 1 ETH = 1,000,000 TEL
    TelToken public token;
    
    // Chainlink ETH / USD price feed
    AggregatorV3Interface internal ethUsdPriceFeed;
    
    constructor(
        address _token,
        address _priceFeed
    ) Ownable(msg.sender) {
        token           = TelToken(_token);
        ethUsdPriceFeed = AggregatorV3Interface(_priceFeed);
    }
    
    receive() external payable {
        revert("Use deposit()");
    }
    
    function deposit() external payable onlyOwner {}
    
    // Chainlink Oracle
    function getEthUsdPrice() public view returns (uint256) {
        (, int256 price,,,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price); 
    }
    
    // Quantos TELs equivalem a 1 ETH
    function getTelPerEth() public view returns (uint256) {
        return rate;
    }   
    
    // Quantos TELs equivalem a 1 USD
    function getTelPerUsd() public view returns (uint256) {
        uint256 ethUsd    = getEthUsdPrice();
        uint256 telPerUsd = (rate * 1e8) / ethUsd;  // ETH/USD vem com 8 decimais
        return telPerUsd;
    }
    
    // Valor em USD de uma quantidade de TEL
    function telToUsd(uint256 telsAmount) public view returns (uint256) {
        uint256 ethUsd    = getEthUsdPrice();
        uint256 ethAmount = telsAmount / rate;
        uint256 usdValue  = (ethAmount * ethUsd) / 1e8;

        return usdValue;
    }

    // Compra de TELs
    function buyTokens() external payable nonReentrant {
        require(msg.value > 0, "Send ETH");
        
        uint256 fee = msg.value / 100; // A taxa é de 1%
        uint256 net = msg.value - fee;

        uint256 telsAmount = net * rate;

        // Interactions
        (bool okFee, ) = payable(owner()).call{value: fee}("");
        require(okFee, "Fee transfer failed");

        token.mint(msg.sender, telsAmount);
    }


    // Venda de TELs
    function sellTokens(uint256 telsAmount) external nonReentrant {
        require(telsAmount > 0, "Amount must be > 0");

        uint256 ethAmount = telsAmount / rate;
        require(address(this).balance >= ethAmount, "Not enough ETH");
        
        uint256 fee = ethAmount / 100; // A taxa é de 1%
        uint256 net = ethAmount - fee;

        // Interactions externas primeiro com tokens (seguro)
        token.transferFrom(msg.sender, address(this), telsAmount);
        token.burn(telsAmount);

        // Interactions com ETH (ponto crítico de reentrancy)
        (bool okUser, ) = payable(msg.sender).call{value: net}("");
        require(okUser, "ETH transfer failed");

        (bool okOwner, ) = payable(owner()).call{value: fee}("");
        require(okOwner, "Fee transfer failed");
    }
    
    // ETHs disponiveis no contrato
    function getContractEthBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
