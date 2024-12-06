import { StakedAndLocked as StakedAndLockedEvent } from "../generated/StakeAndLock/StakeAndLock";
import { Participant, StakedAndLocked } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";


let one = BigInt.fromI32(1);

export function handleStakedAndLocked(event: StakedAndLockedEvent): void {
    let entity = new StakedAndLocked(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    );

    entity.actionId = event.params.actionId;
    entity.user = event.params.user.toHexString();

    entity.metisAmount = event.params.metisAmount;
    entity.artMetisAmount = event.params.artMetisAmount;
    entity.referralId = event.params.referralId.toString();
    entity.unlockTime = event.params.unlockTime;

    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.transactionHash = event.transaction.hash;

    entity.save();


    let participant = Participant.load(event.params.user);
    if (participant == null) {
        participant = new Participant(event.params.user);
        participant.address = event.params.user.toHexString();
        participant.firstBlockNumber = event.block.number;
    }

    participant.totalMetisAmount = participant.totalMetisAmount.plus(
        event.params.metisAmount
    );
    participant.totalArtMetisAmount = participant.totalArtMetisAmount.plus(
        event.params.artMetisAmount
    );
    participant.totalActionsCount = participant.totalActionsCount.plus(
        one
    );

    participant.lastBlockNumber = event.block.number;

    participant.save();
}
