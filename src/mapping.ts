import { StakedAndLocked as StakedAndLockedEvent, Unlock as UnlockedEvent } from "../generated/StakeAndLock/StakeAndLock";
import { BigInt } from "@graphprotocol/graph-ts";
import { createAndUpdateStakeEntity, getOrCreateSystem, unlockStake, updateParticipantAndSystem } from "./helper";

let one = BigInt.fromI32(1);


export function handleStakedAndLocked(event: StakedAndLockedEvent): void {
    createAndUpdateStakeEntity(event);
    updateParticipantAndSystem(event);
}

export function handleUnlocked(event: UnlockedEvent): void {
    let system = getOrCreateSystem();

    unlockStake(event);

    system.totalUnlockActionsByAll = system.totalUnlockActionsByAll.plus(
        one
    );
    system.totalArtMetisUnlockedByAll = system.totalArtMetisUnlockedByAll.plus(
        event.params.artMetisAmount
    );

    system.save();
}
