import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  OwnershipTransferred,
  StakedAndLocked,
  Unlock
} from "../generated/StakeAndLock/StakeAndLock"

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createStakedAndLockedEvent(
  actionId: BigInt,
  user: Address,
  metisAmount: BigInt,
  artMetisAmount: BigInt,
  referralId: string,
  unlockTime: BigInt
): StakedAndLocked {
  let stakedAndLockedEvent = changetype<StakedAndLocked>(newMockEvent())

  stakedAndLockedEvent.parameters = new Array()

  stakedAndLockedEvent.parameters.push(
    new ethereum.EventParam(
      "actionId",
      ethereum.Value.fromUnsignedBigInt(actionId)
    )
  )
  stakedAndLockedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  stakedAndLockedEvent.parameters.push(
    new ethereum.EventParam(
      "metisAmount",
      ethereum.Value.fromUnsignedBigInt(metisAmount)
    )
  )
  stakedAndLockedEvent.parameters.push(
    new ethereum.EventParam(
      "artMetisAmount",
      ethereum.Value.fromUnsignedBigInt(artMetisAmount)
    )
  )
  stakedAndLockedEvent.parameters.push(
    new ethereum.EventParam("referralId", ethereum.Value.fromString(referralId))
  )
  stakedAndLockedEvent.parameters.push(
    new ethereum.EventParam(
      "unlockTime",
      ethereum.Value.fromUnsignedBigInt(unlockTime)
    )
  )

  return stakedAndLockedEvent
}

export function createUnlockEvent(
  actionId: BigInt,
  user: Address,
  artMetisAmount: BigInt
): Unlock {
  let unlockEvent = changetype<Unlock>(newMockEvent())

  unlockEvent.parameters = new Array()

  unlockEvent.parameters.push(
    new ethereum.EventParam(
      "actionId",
      ethereum.Value.fromUnsignedBigInt(actionId)
    )
  )
  unlockEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  unlockEvent.parameters.push(
    new ethereum.EventParam(
      "artMetisAmount",
      ethereum.Value.fromUnsignedBigInt(artMetisAmount)
    )
  )

  return unlockEvent
}
