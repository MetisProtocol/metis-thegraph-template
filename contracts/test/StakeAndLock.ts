
import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { StakeAndLock__factory, ArtmetisMocked__factory, AMTDepositPoolMock__factory } from "../typechain-types";
import hre from "hardhat";

describe("StakeAndLock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const startTime = await time.latest() + 10;
    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [account, otherAccount] = await hre.ethers.getSigners();
    // deploy artmetis mocked token
    const zeroAddress = "0x0000000000000000000000000000000000000000"
    const artmetisMocked = await new ArtmetisMocked__factory(account).deploy(account.address);
    const artmetisMockedAddress = await artmetisMocked.getAddress();
    const amtDepositPoolMock = await new AMTDepositPoolMock__factory(account).deploy(artmetisMockedAddress);
    const amtDepositPoolMockAddress = await amtDepositPoolMock.getAddress();
    // change artmetis mocked owner
    const tx = artmetisMocked.transferOwnership(amtDepositPoolMockAddress);
    await tx;
    // deploy stakeAndLock
    const stakeAndLock = await new StakeAndLock__factory(account).deploy(startTime, unlockTime, amtDepositPoolMockAddress, artmetisMockedAddress);
    const stakeAndLockAddress = await stakeAndLock.getAddress();

    return {
      artmetisMocked,
      artmetisMockedAddress,
      amtDepositPoolMock,
      amtDepositPoolMockAddress,
      stakeAndLock,
      stakeAndLockAddress,
      startTime,
      unlockTime,
      account,
      otherAccount,
      lockedAmount,
      zeroAddress,
      ONE_GWEI
    };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { stakeAndLock, unlockTime } = await loadFixture(deployOneYearLockFixture);

      expect(await stakeAndLock.unlockTime()).to.equal(unlockTime);
    });

    it("Should set the right startTime", async function () {
      const { stakeAndLock, startTime } = await loadFixture(deployOneYearLockFixture);

      expect(await stakeAndLock.startTime()).to.equal(startTime);
    });

    it("Should fail if the unlockTime is not in the future", async function () {
      const { startTime, amtDepositPoolMockAddress, artmetisMockedAddress, account } = await loadFixture(deployOneYearLockFixture);
      const latestTime = await time.latest();
      const stakeAndLockPromise = new StakeAndLock__factory(account).deploy(startTime, latestTime, amtDepositPoolMockAddress, artmetisMockedAddress);
      await expect(stakeAndLockPromise).to.be.revertedWith(
        "Unlock time should be in the future"
      );
    });

    it("Should fail if the starttime is after unlockTime", async function () {
      const { unlockTime, amtDepositPoolMockAddress, artmetisMockedAddress, account } = await loadFixture(deployOneYearLockFixture);
      const stakeAndLockPromise = new StakeAndLock__factory(account).deploy(unlockTime + 10, unlockTime, amtDepositPoolMockAddress, artmetisMockedAddress);
      await expect(stakeAndLockPromise).to.be.revertedWith(
        "Unlock time should be strictly larger than start time"
      );
    });

    it("zero address not allowed for amtPool", async function () {
      const { startTime, unlockTime, zeroAddress, artmetisMockedAddress, account } = await loadFixture(deployOneYearLockFixture);
      const stakeAndLockPromise = new StakeAndLock__factory(account).deploy(startTime, unlockTime, zeroAddress, artmetisMockedAddress);
      await expect(stakeAndLockPromise).to.be.revertedWith("_amtDepositPoolAddress can't be zero");
    });

    it("zero address not allowed for amtPool", async function () {
      const { startTime, unlockTime, zeroAddress, amtDepositPoolMockAddress, account } = await loadFixture(deployOneYearLockFixture);
      const stakeAndLockPromise = new StakeAndLock__factory(account).deploy(startTime, unlockTime, amtDepositPoolMockAddress, zeroAddress);
      await expect(stakeAndLockPromise).to.be.revertedWith("_artmetisAddress can't be zero");
    });
  });

  describe("deposit/withdraw (stake & lock / unstake & unlock", function () {
    it("Can't call deposit before the start time", async function () {
      const { stakeAndLock, account, ONE_GWEI } = await loadFixture(deployOneYearLockFixture);
      const tx = stakeAndLock.connect(account).deposit(0, "", { value: ONE_GWEI });
      await expect(tx).to.be.revertedWith("You can't deposit yet");
    })

    it("Should deposit and get the same amount (first deposit)", async function () {
      const { stakeAndLock, account, ONE_GWEI, startTime, artmetisMocked } = await loadFixture(deployOneYearLockFixture);
      await time.increaseTo(startTime);
      const tx = stakeAndLock.connect(account).deposit(0, "bla", { value: ONE_GWEI });
      // the artmetis amount is the same because this is the first deposit. 
      await expect(tx)
        .to.emit(stakeAndLock, "StakedAndLocked")
        .withArgs(account.address, ONE_GWEI, ONE_GWEI, "bla");
      const accountHolding = await stakeAndLock.artmetisHolders(account.address);
      expect(accountHolding).to.eq(ONE_GWEI);
    })

    it("Should deposit twice", async function () {
      const { stakeAndLock, stakeAndLockAddress, account, ONE_GWEI, startTime, artmetisMocked } = await loadFixture(deployOneYearLockFixture);
      await time.increaseTo(startTime);
      const tx = stakeAndLock.connect(account).deposit(0, "bla", { value: ONE_GWEI });
      await tx;
      await time.increaseTo(startTime + 10);
      const tx2 = stakeAndLock.connect(account).deposit(0, "blabla", { value: ONE_GWEI });
      await tx2;
      await expect(tx2)
        .to.emit(stakeAndLock, "StakedAndLocked")
        .withArgs(account.address, ONE_GWEI, ONE_GWEI, "blabla");
      // check the balance of stakeAndLockAddress
      const balance = await artmetisMocked.balanceOf(stakeAndLockAddress);
      expect(balance).to.eq(2 * ONE_GWEI);
      const holdingAccount = await stakeAndLock.artmetisHolders(account.address);
      expect(holdingAccount).to.eq(2 * ONE_GWEI);
    })

    it("Can't call withdraw before the unlock time", async function () {
      const { stakeAndLock, account } = await loadFixture(deployOneYearLockFixture);
      const tx = stakeAndLock.connect(account).withdraw();
      await expect(tx).to.be.revertedWith("You can't withdraw yet");
    })

    it("Can't call deposit after the end (unlock) time", async function () {
      const { stakeAndLock, account, unlockTime, ONE_GWEI } = await loadFixture(deployOneYearLockFixture);
      await time.increaseTo(unlockTime);
      const tx = stakeAndLock.connect(account).deposit(0, "", { value: ONE_GWEI });
      await expect(tx).to.be.revertedWith("You can't stake & lock anymore");
    })

    it("Caller withdraw when he didn't stake on stakeAndLock", async function () {
      const { stakeAndLock, otherAccount, unlockTime } = await loadFixture(deployOneYearLockFixture);
      const tx = stakeAndLock.connect(otherAccount).withdraw();
      await time.increaseTo(unlockTime);
      await expect(tx).to.be.revertedWith("You don't have any artmetis locked");
    })

    it("Deposit and withdraw successfully", async function () {
      const { stakeAndLock, stakeAndLockAddress, account, ONE_GWEI, startTime, unlockTime, artmetisMocked } = await loadFixture(deployOneYearLockFixture);
      await time.increaseTo(startTime);
      const tx = stakeAndLock.connect(account).deposit(0, "bla", { value: ONE_GWEI });
      await tx;
      const balanceBefore = await artmetisMocked.balanceOf(account.address);
      expect(balanceBefore).to.eq(0);
      await time.increaseTo(unlockTime);
      const tx2 = stakeAndLock.connect(account).withdraw();
      await tx2;
      expect(tx2).emit(artmetisMocked, "Transfer").withArgs(stakeAndLockAddress, account.address, ONE_GWEI);
      const balanceAfter = await artmetisMocked.balanceOf(account.address);
      expect(balanceAfter).to.eq(ONE_GWEI);
    })
  })

})