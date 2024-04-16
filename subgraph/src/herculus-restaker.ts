import { StakeLP as StakeLPEvent } from "../generated/HerculusRestaker/HerculusRestaker";
import { Participant, StakeLP } from "../generated/schema";

export function handleStakeLP(event: StakeLPEvent): void {
  let entity = new StakeLP(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );

  entity.wallet = event.params.wallet.toHexString();

  entity.startingAmount = event.params.startingAmount;
  entity.artMetisAmount = event.params.artMetisAmount;
  entity.metisAmount = event.params.metisAmount;
  entity.lpTokenAmount = event.params.lpTokenAmount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  let participant = Participant.load(event.params.wallet);
  if (participant == null) {
    participant = new Participant(event.params.wallet);
  }

  participant.address = event.params.wallet.toHexString();
  participant.totalMetisUsed = participant.totalMetisUsed.plus(
    event.params.startingAmount,
  );
  participant.totalArtMetis = participant.totalArtMetis.plus(
    event.params.artMetisAmount,
  );
  participant.totalMetisAmount = participant.totalMetisAmount.plus(
    event.params.metisAmount,
  );
  participant.totalLpTokenAmount = participant.totalLpTokenAmount.plus(
    event.params.lpTokenAmount,
  );

  participant.save();
}

