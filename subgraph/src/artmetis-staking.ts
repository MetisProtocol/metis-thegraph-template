import { StakedAndLocked as StakedAndLockedEvent, Unlock as UnlockedEvent } from "../generated/StakeAndLock/StakeAndLock";
import { Participant, StakedAndLocked, CountByMetisAmountStaked, System } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

let zero = BigInt.fromI32(0);
let one = BigInt.fromI32(1);
let oneMetis = BigInt.fromString("1000000000000000000");

function getOrCreateSystem(): System {
    let sys = System.load("SYSTEM");

    if (!sys) {
        sys = new System("SYSTEM");

        sys.totalParticipants = 0;
        sys.totalEligibleParticipants = 0;

        sys.totalMetisStakedByAll = zero;
        sys.totalArtMetisLockedByAll = zero;
        sys.totalActionsCountByAll = zero;

        sys.totalUnlockActionsByAll = zero;
        sys.totalArtMetisUnlockedByAll = zero;
    }
    return sys;
}

export function handleStakedAndLocked(event: StakedAndLockedEvent): void {
    let system = getOrCreateSystem();
    let entity = new StakedAndLocked(
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


    let oldMetisAmounStaked: BigInt;
    let newMetisAmountStaked: BigInt;

    let participant = Participant.load(event.params.user);
    if (participant == null) {
        system.totalParticipants = system.totalParticipants + 1;

        oldMetisAmounStaked = zero;
        newMetisAmountStaked = event.params.metisAmount;

        participant = new Participant(event.params.user);
        participant.address = event.params.user.toHexString();
        participant.firstBlockNumber = event.block.number;
        participant.totalMetisAmount = event.params.metisAmount;
        participant.totalArtMetisAmount = event.params.artMetisAmount;
        participant.totalActionsCount = one;
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
            one
        );
    }

    system.totalMetisStakedByAll = system.totalMetisStakedByAll.plus(
        event.params.metisAmount
    )
    system.totalArtMetisLockedByAll = system.totalArtMetisLockedByAll.plus(
        event.params.artMetisAmount
    )
    system.totalActionsCountByAll = system.totalActionsCountByAll.plus(
        one
    )
    participant.lastBlockNumber = event.block.number;
    participant.save();

    // todo: maybe change entities only when amount are more than one because we don't need stakes that are less than one
    let oldCountByMetisAmountStaked = CountByMetisAmountStaked.load(oldMetisAmounStaked.toHexString());
    // because amounts can only go up, the only case where this doesn't exist is when the old amount is zero
    if (oldCountByMetisAmountStaked != null && oldMetisAmounStaked != zero) {
        oldCountByMetisAmountStaked.count = oldCountByMetisAmountStaked.count - 1;
    }
    else {
        oldCountByMetisAmountStaked = new CountByMetisAmountStaked(oldMetisAmounStaked.toHexString());
        oldCountByMetisAmountStaked.amount = oldMetisAmounStaked;
        oldCountByMetisAmountStaked.count = 0;
    }

    let newCountByMetisAmountStaked = CountByMetisAmountStaked.load(newMetisAmountStaked.toHexString());
    if (newCountByMetisAmountStaked != null) {
        newCountByMetisAmountStaked.count = newCountByMetisAmountStaked.count + 1;
    }
    else {
        newCountByMetisAmountStaked = new CountByMetisAmountStaked(newMetisAmountStaked.toHexString());
        newCountByMetisAmountStaked.amount = newMetisAmountStaked;
        newCountByMetisAmountStaked.count = 1;
    }

    // this works because amounts only go up
    if (oldMetisAmounStaked < oneMetis && newMetisAmountStaked >= oneMetis) {
        system.totalEligibleParticipants = system.totalEligibleParticipants + 1;
    }

    oldCountByMetisAmountStaked.save();
    newCountByMetisAmountStaked.save();

    system.save();
}

export function handleUnlocked(event: UnlockedEvent): void {
    let system = getOrCreateSystem();

    let entity = new StakedAndLocked(
        event.params.actionId.toHexString()
    );

    entity.unlockedBlockNumber = event.block.number;
    entity.unlockedBlockTimestamp = event.block.timestamp;
    entity.unlockedTransactionHash = event.transaction.hash;
    entity.unlockedEventLogIndex = event.logIndex;
    entity.unlocked = true;

    system.totalUnlockActionsByAll = system.totalUnlockActionsByAll.plus(
        one
    );
    system.totalArtMetisUnlockedByAll = system.totalArtMetisUnlockedByAll.plus(
        event.params.artMetisAmount
    );


    entity.save();
    system.save();
}
