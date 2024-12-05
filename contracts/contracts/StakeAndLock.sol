// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {IArtMetis} from "./interfaces/IArtMetis.sol";
import {IAMTDepositPool} from "./interfaces/IAMTDepositPool.sol";

contract StakeAndLock {
    address immutable amtDepositPoolAddress;
    address immutable artmetisAddress;

    uint256 public startTime;
    uint256 public unlockTime;

    mapping(address => uint256) public artmetisHolders;

    event StakedAndLocked(
        address user,
        uint256 metisAmount,
        uint256 artmetisAmount,
        string referralId
    );
    event Withdrawal(uint256 artmetisAmount, uint256 when);

    constructor(uint256 _startTime, uint256 _unlockTime, address _amtDepositPoolAddress, address _artmetisAddress) {
        require(
            block.timestamp < _unlockTime,
            "Unlock time should be in the future"
        );
        require(
            _startTime < _unlockTime,
            "Unlock time should be strictly larger than start time"
        );
        require(_amtDepositPoolAddress != address(0), "_amtDepositPoolAddress can't be zero");
        require(_artmetisAddress != address(0), "_artmetisAddress can't be zero");

        startTime = _startTime;
        unlockTime = _unlockTime;
        amtDepositPoolAddress = _amtDepositPoolAddress;
        artmetisAddress = _artmetisAddress;
    }

    function deposit(
        uint256 _minArtMetisAmountToReceive,
        string calldata _referralId
    ) external payable returns (uint256) {
        require(block.timestamp >= startTime, "You can't deposit yet");
        require(
            block.timestamp <= unlockTime,
            "You can't stake & lock anymore"
        );

        uint256 artMetisAmount = IAMTDepositPool(amtDepositPoolAddress).deposit{
            value: msg.value
        }(_minArtMetisAmountToReceive, _referralId);
        artmetisHolders[msg.sender] += artMetisAmount;
        emit StakedAndLocked(
            msg.sender,
            msg.value,
            artMetisAmount,
            _referralId
        );

        return artMetisAmount;
    }

    function withdraw() public {
        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(artmetisHolders[msg.sender] > 0, "You don't have any artmetis locked");
        
        uint256 amount = artmetisHolders[msg.sender];
        artmetisHolders[msg.sender] = 0;
        bool transferred = IArtMetis(artmetisAddress).transfer(msg.sender, amount);
        assert(transferred);

        emit Withdrawal(address(this).balance, block.timestamp);
    }

    error ErrorSenderNotEOA();
}
