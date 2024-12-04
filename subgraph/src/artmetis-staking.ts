import { MetisDeposited as MetisDepositedEvent } from "../generated/AMTDepositPool/AMTDepositPool";
import { Participant, MetisDeposited } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";


let one = BigInt.fromI32(1);

export function handleMetisDeposited(event: MetisDepositedEvent): void {
    let entity = new MetisDeposited(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    );

    entity.user = event.params._user.toHexString();

    entity.metisAmount = event.params._amount;
    entity.artMetisAmount = event.params._artMetisAmount;
    entity.referralId = event.params._referralId;

    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.transactionHash = event.transaction.hash;

    entity.save();


    let participant = Participant.load(event.params._user);
    if (participant == null) {
        participant = new Participant(event.params._user);
        participant.firstBlockNumber = event.block.number;
        participant.address = event.params._user.toHexString();
    }

    participant.totalMetisAmount = participant.totalMetisAmount.plus(
        event.params._amount
    );
    participant.totalArtMetisAmount = participant.totalArtMetisAmount.plus(
        event.params._artMetisAmount
    );
    participant.totalTransactions = participant.totalTransactions.plus(
        one
    );

    participant.lastBlockNumber = event.block.number;

    participant.save();
}
