
import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { StakeAndLock__factory, ArtmetisMocked__factory, AMTDepositPoolMock__factory, BArtMetis__factory } from "../typechain-types";
import hre from "hardhat";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("StakeAndLock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployTwentyOneDayLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const TWENTY_ONE_DAYS_IN_SECS = 21 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const startTime = await time.latest() + 10;
    const lockedAmount = ONE_GWEI;
    const endTime = (await time.latest()) + TWENTY_ONE_DAYS_IN_SECS;
    const lockingPeriod = TWENTY_ONE_DAYS_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [account, otherAccount] = await hre.ethers.getSigners();
    // deploy artmetis mocked token
    const artmetisMocked = await new ArtmetisMocked__factory(account).deploy(account.address);
    const artmetisMockedAddress = await artmetisMocked.getAddress();
    const amtDepositPoolMock = await new AMTDepositPoolMock__factory(account).deploy(artmetisMockedAddress);
    const amtDepositPoolMockAddress = await amtDepositPoolMock.getAddress();
    // change artmetis mocked owner
    const tx = artmetisMocked.transferOwnership(amtDepositPoolMockAddress);
    await tx;
    // deploy stakeAndLock
    const stakeAndLock = await new StakeAndLock__factory(account).deploy(startTime, endTime, lockingPeriod, amtDepositPoolMockAddress, artmetisMockedAddress);
    const stakeAndLockAddress = await stakeAndLock.getAddress();
    const bArtMetisAddress = await stakeAndLock.bArtMetis();
    const bArtMetis = BArtMetis__factory.connect(bArtMetisAddress, account);

    return {
      artmetisMocked,
      artmetisMockedAddress,
      amtDepositPoolMock,
      amtDepositPoolMockAddress,
      stakeAndLock,
      stakeAndLockAddress,
      bArtMetis,
      bArtMetisAddress,
      startTime,
      endTime,
      lockingPeriod,
      account,
      otherAccount,
      lockedAmount,
      ONE_GWEI
    };
  }

  describe("Deployment", function () {
    it("Should set the right endTime", async function () {
      const { stakeAndLock, endTime } = await loadFixture(deployTwentyOneDayLockFixture);
      expect(await stakeAndLock.endTime()).to.equal(endTime);
    });

    it("Should set the right startTime", async function () {
      const { stakeAndLock, startTime } = await loadFixture(deployTwentyOneDayLockFixture);
      expect(await stakeAndLock.startTime()).to.equal(startTime);
    });

    it("Should set the right lockingPeriod", async function () {
      const { stakeAndLock, lockingPeriod } = await loadFixture(deployTwentyOneDayLockFixture);
      expect(await stakeAndLock.lockingPeriod()).to.equal(lockingPeriod);
    });

    it("Should fail if the endTime is not in the future", async function () {
      const { startTime, lockingPeriod, amtDepositPoolMockAddress, artmetisMockedAddress, account } = await loadFixture(deployTwentyOneDayLockFixture);
      const latestTime = await time.latest();
      const stakeAndLockPromise = new StakeAndLock__factory(account).deploy(startTime, latestTime, lockingPeriod, amtDepositPoolMockAddress, artmetisMockedAddress);
      await expect(stakeAndLockPromise).to.be.revertedWith(
        "End time should be in the future"
      );
    });

    it("Should fail if the starttime is after endTime", async function () {
      const { endTime, lockingPeriod, amtDepositPoolMockAddress, artmetisMockedAddress, account } = await loadFixture(deployTwentyOneDayLockFixture);
      const stakeAndLockPromise = new StakeAndLock__factory(account).deploy(endTime + 10, endTime, lockingPeriod, amtDepositPoolMockAddress, artmetisMockedAddress);
      await expect(stakeAndLockPromise).to.be.revertedWith(
        "End time should be strictly larger than start time"
      );
    });

    it("zero address not allowed for amtPool", async function () {
      const { startTime, endTime, lockingPeriod, artmetisMockedAddress, account } = await loadFixture(deployTwentyOneDayLockFixture);
      const stakeAndLockPromise = new StakeAndLock__factory(account).deploy(startTime, endTime, lockingPeriod, ZERO_ADDRESS, artmetisMockedAddress);
      await expect(stakeAndLockPromise).to.be.revertedWith("_amtDepositPoolAddress can't be zero");
    });

    it("zero address not allowed for amtPool", async function () {
      const { startTime, endTime, lockingPeriod, amtDepositPoolMockAddress, account } = await loadFixture(deployTwentyOneDayLockFixture);
      const stakeAndLockPromise = new StakeAndLock__factory(account).deploy(startTime, endTime, lockingPeriod, amtDepositPoolMockAddress, ZERO_ADDRESS);
      await expect(stakeAndLockPromise).to.be.revertedWith("_artmetisAddress can't be zero");
    });
  });

  describe("deposit/unlock (stake & lock / unstake & unlock", function () {
    it("Can't call deposit before the start time", async function () {
      const { stakeAndLock, account, ONE_GWEI } = await loadFixture(deployTwentyOneDayLockFixture);
      const tx = stakeAndLock.connect(account).deposit(0, "", { value: ONE_GWEI });
      await expect(tx).to.be.revertedWith("You can't deposit yet");
    })

    it("Can't call deposit after the end time", async function () {
      const { stakeAndLock, account, endTime, ONE_GWEI } = await loadFixture(deployTwentyOneDayLockFixture);
      await time.increaseTo(endTime);
      const tx = stakeAndLock.connect(account).deposit(0, "", { value: ONE_GWEI });
      await expect(tx).to.be.revertedWith("You can't stake & lock anymore");
    })

    it("Caller unlocks when he didn't stake on stakeAndLock", async function () {
      const { stakeAndLock, otherAccount, endTime } = await loadFixture(deployTwentyOneDayLockFixture);
      const tx = stakeAndLock.connect(otherAccount).unlock(1);
      await time.increaseTo(endTime);
      await expect(tx).to.be.revertedWith("Invalid action id: tokens for this action already unlocked or action never existed");
    })

    it("Should deposit in the correct time interval and update storage", async function () {
      const { stakeAndLock, bArtMetis, lockingPeriod, account, ONE_GWEI, startTime } = await loadFixture(deployTwentyOneDayLockFixture);
      const stakeTime = startTime + 24 * 60 * 60;
      await time.increaseTo(stakeTime);
      const tx = stakeAndLock.connect(account).deposit(0, "bla", { value: ONE_GWEI });
      const actionId = 1; // first action

      // event
      await expect(tx)
        .to.emit(stakeAndLock, "StakedAndLocked")
        .withArgs(actionId, account.address, ONE_GWEI, ONE_GWEI, "bla");

      // totalMetisStaked
      expect(await stakeAndLock.totalMetisStaked(account), "totalMetisStaked mapping wrong").to.eq(ONE_GWEI);

      // stakeLockActions mapping
      const { metisAmount: recMetisAmount, artMetisAmount: recArtMetisAmount, unlockTime: recUnlockTime, locked: recLocked } = await stakeAndLock.stakeLockActions(actionId);
      expect(recMetisAmount).to.eq(ONE_GWEI);
      expect(recArtMetisAmount).to.eq(ONE_GWEI);
      expect(recUnlockTime).to.eq(stakeTime + lockingPeriod + 1);
      expect(recLocked).to.eq(true);

      // check BArtMetis balance
      expect(await bArtMetis.balanceOf(account, actionId)).to.eq(ONE_GWEI);
      expect(await bArtMetis.balanceOf(account, 0)).to.eq(0);
      expect(await bArtMetis.balanceOf(account, 2)).to.eq(0);
    })

    it("Should deposit from two different accounts", async function () {
      const { stakeAndLock, bArtMetis, account, otherAccount, ONE_GWEI, startTime } = await loadFixture(deployTwentyOneDayLockFixture);
      const firstStakeTime = startTime + 24 * 60 * 60;
      await time.increaseTo(firstStakeTime);
      await stakeAndLock.connect(account).deposit(0, "bla", { value: ONE_GWEI });
      const firstActionId = 1; // first action
      const secondStakeTime = firstStakeTime + 24 * 60 * 60;
      await time.increaseTo(secondStakeTime);
      await stakeAndLock.connect(otherAccount).deposit(0, "bla", { value: 2 * ONE_GWEI });
      const secondActionId = 2; // first action

      // check BArtMetis balance
      expect(await bArtMetis.balanceOf(account, firstActionId)).to.eq(ONE_GWEI);
      expect(await bArtMetis.balanceOf(account, secondActionId)).to.eq(0);
      expect(await bArtMetis.balanceOf(otherAccount, firstActionId)).to.eq(0);
      expect(await bArtMetis.balanceOf(otherAccount, secondActionId)).to.eq(2 * ONE_GWEI);
    })

    it("Can't call unlock before the unlock time", async function () {
      const { stakeAndLock, bArtMetis, lockingPeriod, account, ONE_GWEI, startTime } = await loadFixture(deployTwentyOneDayLockFixture);
      const stakeTime = startTime + 24 * 60 * 60;
      const tryUnlockTime = stakeTime + lockingPeriod - 24 * 60 * 60; // one day before the locking period ends
      await time.increaseTo(stakeTime);
      await stakeAndLock.connect(account).deposit(0, "bla", { value: ONE_GWEI });
      const actionId = 1; // first action

      await time.increaseTo(tryUnlockTime);
      const tx = stakeAndLock.connect(account).unlock(actionId);
      expect(tx).to.be.revertedWith(
        "You can't unlock yet"
      );
    })

    it("Should deposit, then other account tries unlocking and fails", async function () {
      const { stakeAndLock, otherAccount, bArtMetis, lockingPeriod, account, ONE_GWEI, startTime } = await loadFixture(deployTwentyOneDayLockFixture);
      const stakeTime = startTime + 24 * 60 * 60;
      const tryUnlockTime = stakeTime + lockingPeriod + 24 * 60 * 60; // one day after the locking period ends
      await time.increaseTo(stakeTime);
      await stakeAndLock.connect(account).deposit(0, "bla", { value: ONE_GWEI });
      const actionId = 1; // first action

      await time.increaseTo(tryUnlockTime);
      const tx = stakeAndLock.connect(otherAccount).unlock(actionId);
      expect(tx)
        .to.revertedWithCustomError(bArtMetis, "ERC1155InsufficientBalance")
        .withArgs(otherAccount.address, 0, ONE_GWEI, actionId)
    })

    it("Should deposit then unlock successfully", async function () {
      const { stakeAndLock, bArtMetis, lockingPeriod, account, ONE_GWEI, startTime, artmetisMocked } = await loadFixture(deployTwentyOneDayLockFixture);
      const stakeTime = startTime + 24 * 60 * 60;
      const tryUnlockTime = stakeTime + lockingPeriod + 24 * 60 * 60; // one day after the locking period
      await time.increaseTo(stakeTime);
      await stakeAndLock.connect(account).deposit(0, "bla", { value: ONE_GWEI });
      const actionId = 1; // first action

      await time.increaseTo(tryUnlockTime);
      const tx = stakeAndLock.connect(account).unlock(actionId);

      expect(tx).to.emit(stakeAndLock, "Unlock").withArgs(ONE_GWEI, stakeTime + 1);

      // totalMetisStaked
      expect(await stakeAndLock.totalMetisStaked(account), "totalMetisStaked mapping wrong").to.eq(ONE_GWEI);

      // stakeLockActions mapping
      const { metisAmount: recMetisAmount, artMetisAmount: recArtMetisAmount, unlockTime: recUnlockTime, locked: recLocked } = await stakeAndLock.stakeLockActions(actionId);
      expect(recMetisAmount).to.eq(ONE_GWEI);
      expect(recArtMetisAmount).to.eq(ONE_GWEI);
      expect(recUnlockTime).to.eq(stakeTime + lockingPeriod + 1);
      expect(recLocked).to.eq(false);

      // check BArtMetis balance
      expect(await bArtMetis.balanceOf(account, actionId)).to.eq(0);
      // check artMetis balance
      expect(await artmetisMocked.balanceOf(account)).to.eq(ONE_GWEI);
    })

    it("Should deposit & unlock then fail to unlock again", async function () {
      const { stakeAndLock, bArtMetis, lockingPeriod, account, ONE_GWEI, startTime, artmetisMocked } = await loadFixture(deployTwentyOneDayLockFixture);
      const stakeTime = startTime + 24 * 60 * 60;
      const tryUnlockTime = stakeTime + lockingPeriod + 24 * 60 * 60; // one day after the locking period
      await time.increaseTo(stakeTime);
      await stakeAndLock.connect(account).deposit(0, "bla", { value: ONE_GWEI });
      const actionId = 1; // first action
      await time.increaseTo(tryUnlockTime);
      await stakeAndLock.connect(account).unlock(actionId);
      const tx = stakeAndLock.connect(account).unlock(actionId);;
      await expect(tx).to.be.revertedWith("Invalid action id: tokens for this action already unlocked or action never existed");
    })
  })

})