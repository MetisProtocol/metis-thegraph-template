import { StakedAndLocked as StakedAndLockedEvent, Unlock as UnlockedEvent } from "../generated/StakeAndLock/StakeAndLock";
import { Participant, StakedAndLocked } from "../generated/schema";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";


let one = BigInt.fromI32(1);

export function handleStakedAndLocked(event: StakedAndLockedEvent): void {
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


    let participant = Participant.load(event.params.user);
    if (participant == null) {
        participant = new Participant(event.params.user);
        participant.address = event.params.user.toHexString();
        participant.firstBlockNumber = event.block.number;
        participant.totalMetisAmount = event.params.metisAmount;
        participant.totalArtMetisAmount = event.params.artMetisAmount;
        participant.totalActionsCount = one;
    }
    else {
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

    participant.lastBlockNumber = event.block.number;

    participant.save();
}

export function handleUnlocked(event: UnlockedEvent): void {
    let entity = new StakedAndLocked(
        event.params.actionId.toHexString()
    );

    entity.unlockedBlockNumber = event.block.number;
    entity.unlockedBlockTimestamp = event.block.timestamp;
    entity.unlockedTransactionHash = event.transaction.hash;
    entity.unlockedEventLogIndex = event.logIndex;
    entity.unlocked = true;

    entity.save();
}
