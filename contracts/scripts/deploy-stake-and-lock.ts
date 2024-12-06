
import { Wallet, JsonRpcProvider } from "ethers";
import { StakeAndLock__factory } from "../typechain-types";
import { HardhatRuntimeEnvironment, HttpNetworkConfig } from "hardhat/types";
import hre from "hardhat";

type NetworkType = "mts_mainnet" | "mts_sepolia";

async function main() {
    const networkName = process.env.NETWORK_NAME! as NetworkType;
    const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY!;
    const config = hre.config.networks[networkName] as HttpNetworkConfig;
    const singer = new Wallet(deployerPrivateKey, new JsonRpcProvider(config.url));

    const contractInitParams = {
        mts_mainnet: {
            startTime: 1736402400,             // Tuesday, January 9, 2025 6:00:00 AM
            endTime: 1738216800,               // Tuesday, January 30, 2025 6:00:00 AM
            lockingPeriod: 21 * 24 * 60 * 60,  // 21 days
            // can be found here: https://docs.artemisfinance.io/integration/deployed-contracts/metis
            amtDepositPoolAddress: "0x96C4A48Abdf781e9c931cfA92EC0167Ba219ad8E",
            artmetisAddress: "0x2583A2538272f31e9A15dD12A432B8C96Ab4821d"
        },
        mts_sepolia: {
            startTime: 1736402400,             // Tuesday, January 9, 2025 6:00:00 AM
            endTime: 1738216800,               // Tuesday, January 30, 2025 6:00:00 AM
            lockingPeriod: 21 * 24 * 60 * 60,  // 21 days
            // todo: maybe deploy mocks?
            amtDepositPoolAddress: "0x0000000000000000000000000000000000000001",
            artmetisAddress: "0x0000000000000000000000000000000000000001"
        }
    }

    const initPrams = contractInitParams[networkName]!;

    const contract = await new StakeAndLock__factory(singer).deploy(
        initPrams.startTime,
        initPrams.endTime,
        initPrams.lockingPeriod,
        initPrams.amtDepositPoolAddress,
        initPrams.artmetisAddress
    )
    const txReceipt = (await (contract.deploymentTransaction()!).wait(1))!;
    const contractAddress = await contract.getAddress()

    console.log(`contract StakeAndLock successfully deployed with tx hash ${txReceipt.hash}`);
    console.log(`Deployed to ${contractAddress}`)

    console.log("You can verify the smart contract with the following command:")
    console.log(`npx hardhat verify --network ${networkName} ${contractAddress} ` + 
        `${initPrams.startTime} ${initPrams.endTime} ${initPrams.lockingPeriod} ` + 
        `${initPrams.amtDepositPoolAddress} ${initPrams.artmetisAddress}`)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
