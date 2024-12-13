import { ethers } from 'ethers';
import { env } from './envConfig';

const provider = new ethers.JsonRpcProvider(env.METIS_RPC);

const abi = [
    {
        inputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        name: 'totalMetisStaked',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
];

const contract = new ethers.Contract(env.CONTRACT_ADDRESS, abi, provider);

export { provider, contract };
