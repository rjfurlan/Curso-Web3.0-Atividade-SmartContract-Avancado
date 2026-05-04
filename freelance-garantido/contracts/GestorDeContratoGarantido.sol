// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ContractNFT.sol";
import "./TelToken.sol";

interface IDAO {
    function openCase(
        uint256 jobId,
        uint256 guarantee
    ) external;
}
    
contract GestorDeContratoGarantido is Ownable, ReentrancyGuard {
    TelToken    public token;
    ContractNFT public nft;
    address     public dao;

    uint256 public jobCount;
    uint256 public feePercent = 2; // taxa de 2%

    constructor(
        address _token,
        address _nft,
        address _dao
    ) Ownable(msg.sender){
        token = TelToken(_token);
        nft   = ContractNFT(_nft);
        dao   = _dao;
    }

    enum Status {
        Created,
        Accepted,
        Delivered,
        Disputed,
        CompletedOk,
        CompletedReject,
        Cancelled
    }

    struct Job {
        address client;
        address freelancer;

        uint256 payment;
        uint256 guarantee;

        uint256 deadline;
        uint256 delivered;
        uint256 acceptDeadline;

        Status status;
    }

    mapping(uint256 => Job) public jobs;
    
    // Criar contrato
    function createJob(
        uint256 _payment,
        uint256 _guarantee,
        uint256 _deadline,
        uint256 _acceptDeadline
    ) external nonReentrant {
        require(_payment > 0, "Invalid payment");

        uint256 fee   = (_payment * feePercent) / 100;
        uint256 total =  _payment + fee;

        // Cliente paga garantia e taxa
        token.transferFrom(msg.sender, address(this), total);
        
        // Envia taxa para admin
        token.transfer(owner(), fee);

        jobs[jobCount] = Job({
            client:         msg.sender,
            freelancer:     address(0),
            payment:        _payment,
            guarantee:      _guarantee,
            deadline:       _deadline,
            delivered:      0,
            acceptDeadline: _acceptDeadline,
            status:         Status.Created
        });
        
        // mint NFT do contrato
        nft.mint(msg.sender, jobCount, uint8(0));
        
        jobCount++;
    }

    // Freelancer aceita
    function acceptJob(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];

        require(job.status == Status.Created, "Invalid state");
        require(block.timestamp <= job.acceptDeadline, "Expired");

        token.transferFrom(msg.sender, address(this), job.guarantee);
        
        // mint NFT do contrato
        nft.mint(msg.sender, jobId, uint8(1));

        job.freelancer = msg.sender;
        job.status = Status.Accepted;
    }

    // Freelancer entrega
    function markDelivered(uint256 jobId) external {
        Job storage job = jobs[jobId];

        require(msg.sender == job.freelancer, "Not freelancer");
        require(job.status == Status.Accepted, "Invalid state");

        job.status    = Status.Delivered;
        job.delivered = block.timestamp;
    }

    // Cliente aprova
    function approveWork(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];

        require(msg.sender == job.client, "Not client");
        require(job.status == Status.Delivered, "Invalid state");

        job.status = Status.CompletedOk;

        token.transfer(job.freelancer, job.payment + job.guarantee);
    }

    // Abrir disputa
    function openDispute(uint256 jobId) external {
        Job storage job = jobs[jobId];

        require(
            msg.sender == job.client || msg.sender == job.freelancer,
            "Not allowed"
        );

        require(job.status == Status.Delivered, "Invalid state");

        job.status = Status.Disputed;
        
        // chama DAO
        IDAO(dao).openCase(jobId, job.guarantee);
    }

    // Timeout: ninguém aceitou
    function cancelIfNotAccepted(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];

        require(job.status == Status.Created, "Invalid state");
        require(block.timestamp > job.acceptDeadline, "Too early");

        job.status = Status.Cancelled;

        token.transfer(job.client, job.payment);
    }

    // Freelancer não entregou
    function claimTimeout(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];

        require(msg.sender == job.client, "Not client");
        require(job.status == Status.Accepted, "Invalid state");
        require(block.timestamp > job.deadline, "Too early");

        job.status = Status.CompletedReject;

        // cliente recebe tudo
        token.transfer(job.client, job.payment + job.guarantee);
    }
    
    function resolveFromDAO(uint256 jobId, bool clientWins) external {
        require(msg.sender == dao, "Not DAO");

        Job storage job = jobs[jobId];

        if (clientWins) {
            token.transfer(job.client, job.guarantee);
            job.status = Status.CompletedReject;
        } else {
            token.transfer(job.freelancer, job.payment + job.guarantee);
            job.status = Status.CompletedOk;
        }       
    }
}
