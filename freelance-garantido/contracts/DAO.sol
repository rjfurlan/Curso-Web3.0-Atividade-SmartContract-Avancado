// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GestorDeContratoGarantido.sol";
import "./Staking.sol";


contract DAO {
    address public gestor;
    Staking public staking;

    uint256 public disputeCount;

    struct Dispute {
        uint256 jobId;
        uint256 votesClient;
        uint256 votesFreelancer;
        bool    resolved;
        uint256 stakePerJuror;
    }

    mapping(uint256 => Dispute) public disputes;

    mapping(uint256 => address[]) public voters;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public votedFreelancer;

    // Config
    function setConfig(address _gestor, address _staking) external {
        require(gestor == address(0), "Already set");

        gestor = _gestor;
        staking = Staking(_staking);
    }
    
    // Abrir Disputa
    function openCase(uint256 jobId, uint256 guarantee) external {
        require(msg.sender == gestor, "Not gestor");

        uint256 stakeRequired = guarantee / 10;

        disputes[disputeCount] = Dispute({
            jobId: jobId,
            votesClient: 0,
            votesFreelancer: 0,
            resolved: false,
            stakePerJuror: stakeRequired
        });

        disputeCount++;
    }

    // Votar
    function vote(uint256 disputeId, bool voteFreelancerChoice) external {
        Dispute storage d = disputes[disputeId];

        require(!d.resolved, "Resolved");
        require(!hasVoted[disputeId][msg.sender], "Already voted");

        // Exige stake
        require(staking.stakes(msg.sender) >= d.stakePerJuror, "Not enough stake" );

        // Trava stake
        staking.lock(msg.sender, d.stakePerJuror);

        // Registra voto
        voters[disputeId].push(msg.sender);
        votedFreelancer[disputeId][msg.sender] = voteFreelancerChoice;
        hasVoted[disputeId][msg.sender] = true;

        if (voteFreelancerChoice) {
            d.votesFreelancer++;
        } else {
            d.votesClient++;
        }

        uint256 totalVotes = d.votesClient + d.votesFreelancer;

        // resolve com 3 votos
        if (totalVotes >= 3) {
            _resolve(disputeId);
        }
    }

    // Resolver
    function _resolve(uint256 disputeId) internal {
        Dispute storage d = disputes[disputeId];

        require(!d.resolved, "Already resolved");

        bool freelancerWins = d.votesFreelancer > d.votesClient;

        address[] memory list = voters[disputeId];

        uint256 losersPool = 0;
        uint256 winnersCount = 0;

        // Calcula pool e vencedores
        for (uint i = 0; i < list.length; i++) {
            address user = list[i];

            bool voted = votedFreelancer[disputeId][user];

            if (voted == freelancerWins) {
                winnersCount++;
            } else {
                staking.slash(user, d.stakePerJuror);
                losersPool += d.stakePerJuror;
            }
        }

        require(winnersCount > 0, "No winners");

        uint256 rewardPerWinner = losersPool / winnersCount;

        // Paga e libera stake
        for (uint i = 0; i < list.length; i++) {
            address user = list[i];

            bool voted = votedFreelancer[disputeId][user];

            if (voted == freelancerWins) {
                staking.unlock(user, d.stakePerJuror);
                staking.reward(user, rewardPerWinner);
            }
        }

        d.resolved = true;

        // Chama gestor
        GestorDeContratoGarantido(gestor).resolveFromDAO(d.jobId, !freelancerWins);
    }
}
