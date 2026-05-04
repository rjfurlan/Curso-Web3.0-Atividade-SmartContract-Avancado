// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract ContractNFT is ERC721Enumerable {
    address public gestor;
    uint256 public nftCount;
    
    struct JobMetadata {
       uint256 jobId;
       address owner;
       uint8   role;        // 0 ==> Client,  1==> Freelancer
       bool    active;
    }

    mapping(uint256 => JobMetadata) public jobs;
    mapping(uint256 => uint256[])   public jobToTokens;

    constructor()
        ERC721("Freelance Contract", "FCON")
    {}

    modifier onlyGestor() {
        require(msg.sender == gestor, "Not authorized");
        _;
    }

    function mint(
        address to,
        uint256 jobId,
        uint8   role
    ) external onlyGestor returns (uint256) {
        _safeMint(to, nftCount);
        
        jobs[nftCount] = JobMetadata({            
            jobId:  jobId,
            owner:  to,
            role:   role,
            active: true
        });
        
        jobToTokens[jobId].push(nftCount);
        
        uint256 ret = nftCount;
        nftCount++;

        return ret;
    }

    function getTokensByJob(uint256 jobId) external view returns (uint256[] memory) {
        return jobToTokens[jobId];
    }    
    
    function closeJob(uint256 tokenId) external onlyGestor {
        jobs[tokenId].active = false;
    }
    function setGestor(address _gestor) external {
       require(gestor == address(0), "Already set");
       gestor = _gestor;
    }
}
