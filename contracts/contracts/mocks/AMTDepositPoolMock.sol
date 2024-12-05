// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {IAMTDepositPool} from "../interfaces/IAMTDepositPool.sol";
import {IArtMetis} from "../interfaces/IArtMetis.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";


contract AMTDepositPoolMock is IAMTDepositPool {
    address immutable artmetis;
    uint256 public totalDeposits;

    constructor(address _artmetis) {
        artmetis = _artmetis;
    }

    function getArtMetisAmountToMint(
        uint256 _amount
    ) public view returns (uint256) {
        if (totalDeposits == 0) {
            return _amount;
        }
        return (_amount * IArtMetis(artmetis).totalSupply()) / totalDeposits;
    }

    function deposit(
        uint256 _minArtMetisAmountToReceive,
        string calldata _referralId
    ) external payable returns (uint256) {
        require(msg.value > 0, "AMTDepositPool: INVALID_AMOUNT");
        uint256 artMetisAmount = getArtMetisAmountToMint(msg.value);
        require(
            artMetisAmount >= _minArtMetisAmountToReceive,
            "AMTDepositPool: artMetis is too high"
        );

        totalDeposits += msg.value;
        IArtMetis(artmetis).mint(msg.sender, artMetisAmount);

        emit MetisDeposited(msg.sender, msg.value, artMetisAmount, _referralId);
        return artMetisAmount;
    }

    function harvest() external {}

    function bridgeMetisToL1(uint32 l1Gas) external payable {}

    function adminWithdrawMetis(uint256 _amount) external {}

    function initiateWithdrawalFor(
        address _user,
        uint256 _artMetisAmount,
        uint256 _depositAmount
    ) external {}
}
