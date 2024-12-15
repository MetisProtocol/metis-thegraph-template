// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {BArtMetis} from "./BArtMetis.sol";
import {IAMTDepositPool} from "./interfaces/IAMTDepositPool.sol";
import {IArtMetis} from "./interfaces/IArtMetis.sol";

/**
 * @title StakeAndLock
 * @dev A contract for managing the binance campaign. It stakes Metis on behalf of users on Artemis.
 * It locks the received ArtMetis tokens and unlocks them only when a certain period (21 days) has passed.
 * The locking applies for each staking action. A user has to unlock multiple times if they did multiple
 * staking actions on different occasions. This is done using ERC1155Supply to keep track of staking action.
 */
contract StakeAndLock is Ownable(msg.sender) {
    struct StakeLockAction {
        uint256 metisAmount; // Metis amount staked
        uint256 artMetisAmount; // Received artMetis amount in the action
        uint256 unlockTime; // when a user can unlock their artMetis tokens.
        bool locked;
    }

    // staking contract
    IAMTDepositPool public immutable amtDepositPool;
    IArtMetis public immutable artMetis;
    // ERC1155Supply to keep track of staking actions
    BArtMetis public bArtMetis;

    // The time interval of the campaign. Users can stake during this period
    uint256 public startTime;
    uint256 public endTime;

    // The time needed to lock for a user to be eligible for rewards
    uint256 public lockingPeriod;

    // mapping to keep track who has staked more than 1 Metis (completed the task)
    mapping(address => uint256) public totalMetisStaked;

    // keep track of actions to enforce the 21-lock period on each deposit.
    mapping(uint256 => StakeLockAction) public stakeLockActions;
    uint256 public stakeLockActionsCount;

    event StakedAndLocked(
        uint256 indexed actionId,
        address indexed user,
        uint256 metisAmount,
        uint256 artMetisAmount,
        string indexed referralId,
        uint256 unlockTime
    );

    event Unlock(
        uint256 indexed actionId,
        address indexed user,
        uint256 artMetisAmount
    );

    constructor(
        uint256 _startTime,
        uint256 _endTime,
        uint256 _lockingPeriod,
        address _amtDepositPoolAddress,
        address _artmetisAddress
    ) {
        require(block.timestamp < _endTime, "End time should be in the future");
        require(
            _startTime < _endTime,
            "End time should be strictly larger than start time"
        );
        require(_lockingPeriod > 0, "Locking period can't be zero");
        require(
            _amtDepositPoolAddress != address(0),
            "_amtDepositPoolAddress can't be zero"
        );
        require(
            _artmetisAddress != address(0),
            "_artmetisAddress can't be zero"
        );

        startTime = _startTime;
        endTime = _endTime;
        lockingPeriod = _lockingPeriod;
        amtDepositPool = IAMTDepositPool(_amtDepositPoolAddress);
        artMetis = IArtMetis(_artmetisAddress);
        bArtMetis = new BArtMetis("");
    }

    function deposit(
        uint256 _minArtMetisAmountToReceive,
        string calldata _referralId
    ) external payable returns (uint256) {
        require(block.timestamp >= startTime, "You can't deposit yet");
        require(block.timestamp <= endTime, "You can't stake & lock anymore");

        uint256 _artMetisAmount = amtDepositPool.deposit{value: msg.value}(
            _minArtMetisAmountToReceive,
            _referralId
        );
        ++stakeLockActionsCount;
        uint256 unlockTime = block.timestamp + lockingPeriod;
        stakeLockActions[stakeLockActionsCount] = StakeLockAction({
            metisAmount: msg.value,
            artMetisAmount: _artMetisAmount,
            unlockTime: unlockTime,
            locked: true
        });
        bArtMetis.mint(msg.sender, stakeLockActionsCount, _artMetisAmount, "");

        totalMetisStaked[msg.sender] += msg.value;

        emit StakedAndLocked(
            stakeLockActionsCount,
            msg.sender,
            msg.value,
            _artMetisAmount,
            _referralId,
            unlockTime
        );

        return _artMetisAmount;
    }

    function unlock(uint256 actionId) public {
        require(
            stakeLockActions[actionId].locked,
            "Invalid action id: tokens for this action already unlocked or action never existed"
        );
        require(
            block.timestamp > stakeLockActions[actionId].unlockTime,
            "You can't unlock yet"
        );

        stakeLockActions[actionId].locked = false;
        uint256 _artMetisAmount = stakeLockActions[actionId].artMetisAmount;
        bArtMetis.burn(msg.sender, actionId, _artMetisAmount);

        bool transferred = artMetis.transfer(msg.sender, _artMetisAmount);
        assert(transferred);

        emit Unlock(actionId, msg.sender, _artMetisAmount);
    }

    /**
     * @notice Recovers the funds sent to the contract in case of an emergency
     * @dev This function can be only called by the owner
     */
    function emergencyRecoverToken(
        address token,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
}
