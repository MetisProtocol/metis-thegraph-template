
import { Wallet, JsonRpcProvider, parseEther, Signature } from "ethers";
import { StakeAndLock__factory } from "../typechain-types";
import { HardhatRuntimeEnvironment, HttpNetworkConfig } from "hardhat/types";
import hre from "hardhat";

type NetworkType = "mts_mainnet" | "mts_sepolia";

async function main() {
    const networkName = process.env.NETWORK_NAME! as NetworkType;
    const stakeAndLockAddress = process.env.STAKE_AND_LOCK! as string;
    const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY!;

    const config = hre.config.networks[networkName] as HttpNetworkConfig;
    const signer = new Wallet(deployerPrivateKey, new JsonRpcProvider(config.url));
    const stakeAndLock = StakeAndLock__factory.connect(stakeAndLockAddress, signer);
    
    const amount = parseEther("1.1");
    const tx = await stakeAndLock.deposit(0, "", { value: amount });
    await tx.wait();
    const totalMetisStaked = await stakeAndLock.totalMetisStaked(signer.address);

    console.log(`Deposited ${amount}. Total Metis staked ${totalMetisStaked}.\nTx hash: ${tx.hash}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
