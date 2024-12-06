
import { Wallet, JsonRpcProvider } from "ethers";
import { AMTDepositPoolMock__factory, ArtmetisMocked__factory, StakeAndLock__factory } from "../typechain-types";
import { HardhatRuntimeEnvironment, HttpNetworkConfig } from "hardhat/types";
import hre from "hardhat";

type NetworkType = "mts_mainnet" | "mts_sepolia";

async function main() {
    const networkName = process.env.NETWORK_NAME! as NetworkType;
    const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY!;
    const config = hre.config.networks[networkName] as HttpNetworkConfig;
    const account = new Wallet(deployerPrivateKey, new JsonRpcProvider(config.url));

    // deploy artmetis mocked token
    const artmetisMocked = await new ArtmetisMocked__factory(account).deploy(account.address);
    const artmetisMockedAddress = await artmetisMocked.getAddress();
    const artmetisMockedReceipt = (await (artmetisMocked.deploymentTransaction()!).wait(1))!;

    console.log(`contract artmetisMocked successfully deployed with tx hash ${artmetisMockedReceipt.hash}`);
    console.log(`Deployed to ${artmetisMockedAddress}\n`);

    console.log("You can verify the artmetisMocked smart contract with the following command:")
    console.log(`npx hardhat verify --network ${networkName} ${artmetisMockedAddress} ` +
        `${account.address}\n\n`);

    const amtDepositPoolMock = await new AMTDepositPoolMock__factory(account).deploy(artmetisMockedAddress);
    const amtDepositPoolMockAddress = await amtDepositPoolMock.getAddress();
    const amtDepositPoolMockReceipt = (await (amtDepositPoolMock.deploymentTransaction()!).wait(1))!;

    // change artmetis mocked owner
    const tx = artmetisMocked.transferOwnership(amtDepositPoolMockAddress);
    await tx;

    console.log(`contract amtDepositPoolMock successfully deployed with tx hash ${amtDepositPoolMockReceipt.hash}`);
    console.log(`Deployed to ${amtDepositPoolMockAddress}\n`);

    console.log("You can verify the amtDepositPoolMock smart contract with the following command:")
    console.log(`npx hardhat verify --network ${networkName} ${amtDepositPoolMockAddress} ` +
        `${artmetisMockedAddress}`
    );

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
