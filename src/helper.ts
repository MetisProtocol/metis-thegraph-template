import { System, Position, Participant } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";
import { StakedAndLocked as StakedAndLockedEvent } from "../generated/StakeAndLock/StakeAndLock";
import { Unlock as UnlockedEvent } from "../generated/StakeAndLock/StakeAndLock";

const ZERO = BigInt.fromI32(0);
const ONE = BigInt.fromI32(1);
const ONE_ETHER = BigInt.fromString("1000000000000000000");

export function getOrCreateSystem(): System {
    let sys = System.load("SYSTEM");

    if (!sys) {
        sys = new System("SYSTEM");

        sys.totalParticipants = 0;
        sys.totalEligibleParticipants = 0;

        sys.totalMetisStakedByAll = ZERO;
        sys.totalArtMetisLockedByAll = ZERO;
        sys.totalActionsCountByAll = ZERO;

        sys.totalUnlockActionsByAll = ZERO;
        sys.totalArtMetisUnlockedByAll = ZERO;
    }
    return sys;
}

export function createAndUpdateStakeEntity(
    event: StakedAndLockedEvent
): void {
    let entity = new Position(
        event.params.actionId.toHexString()
    );

    entity.actionId = event.params.actionId;
    entity.user = event.params.user.toHexString();

    entity.metisAmount = event.params.metisAmount;
    entity.artMetisAmount = event.params.artMetisAmount;
    entity.referralId = event.params.referralId.toHexString();
    entity.unlockTime = event.params.unlockTime;

    entity.stakedAndLockedBlockNumber = event.block.number;
    entity.stakedAndLockedBlockTimestamp = event.block.timestamp;
    entity.stakedAndLockedTransactionHash = event.transaction.hash;
    entity.stakedAndLockedEventLogIndex = event.logIndex;
    entity.unlocked = false;

    entity.save();
}

export function unlockStake(event: UnlockedEvent): void {
    let entity = new Position(
        event.params.actionId.toHexString()
    );

    entity.unlockedBlockNumber = event.block.number;
    entity.unlockedBlockTimestamp = event.block.timestamp;
    entity.unlockedTransactionHash = event.transaction.hash;
    entity.unlockedEventLogIndex = event.logIndex;
    entity.unlocked = true;

    entity.save();
}

export function updateParticipantAndSystem(event: StakedAndLockedEvent): void {
    let oldMetisAmounStaked: BigInt;
    let newMetisAmountStaked: BigInt;
    let system = getOrCreateSystem();

    let participant = Participant.load(event.params.user);
    if (participant == null) {
        system.totalParticipants = system.totalParticipants + 1;

        oldMetisAmounStaked = ZERO;
        newMetisAmountStaked = event.params.metisAmount;

        participant = new Participant(event.params.user);
        participant.address = event.params.user.toHexString();
        participant.firstBlockNumber = event.block.number;
        participant.totalMetisAmount = event.params.metisAmount;
        participant.totalArtMetisAmount = event.params.artMetisAmount;
        participant.totalActionsCount = ONE;
    }
    else {
        oldMetisAmounStaked = participant.totalMetisAmount;
        newMetisAmountStaked = participant.totalMetisAmount.plus(
            event.params.metisAmount
        );

        participant.totalMetisAmount = participant.totalMetisAmount.plus(
            event.params.metisAmount
        );
        participant.totalArtMetisAmount = participant.totalArtMetisAmount.plus(
            event.params.artMetisAmount
        );
        participant.totalActionsCount = participant.totalActionsCount.plus(
            ONE
        );
    }

    system.totalMetisStakedByAll = system.totalMetisStakedByAll.plus(
        event.params.metisAmount
    )
    system.totalArtMetisLockedByAll = system.totalArtMetisLockedByAll.plus(
        event.params.artMetisAmount
    )
    system.totalActionsCountByAll = system.totalActionsCountByAll.plus(
        ONE
    )
    participant.lastBlockNumber = event.block.number;
    participant.save();

    // this works because amounts only go up
    if (oldMetisAmounStaked < ONE_ETHER && newMetisAmountStaked >= ONE_ETHER) {
        system.totalEligibleParticipants = system.totalEligibleParticipants + 1;
    }
    system.save();
}