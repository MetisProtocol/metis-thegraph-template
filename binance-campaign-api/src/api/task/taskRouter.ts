import express, { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
    ResponseCode,
    responseCodeToStatus,
    ResponseWrapper,
} from '@/common/models/serviceResponse';
import { DoNothingError } from '@/common/utils/error';
import {
    arrayHasAllowedValues,
    isArrayOfStrings,
    isEvmAddress,
} from '@/common/utils/checkers';
import { abi } from '@/common/utils/rpc';
import { authSignature } from '@/common/middleware/authSignature';
import { recvWindowValidation } from '@/common/middleware/recvWindowValidation';
import { ethers } from 'ethers';
import { env } from '@/common/utils/envConfig';

const taskRouter = express.Router();
taskRouter.use(authSignature, recvWindowValidation);

const allowedTaskNames = ['stake'];

const ONE_METIS = ethers.parseEther("1");

taskRouter.get('/completion', async (req: Request, res: Response) => {
    try {
        const { task: taskString, walletAddress } = req.query;
        if (typeof taskString !== 'string') {
            const response: ResponseWrapper<null> = {
                code: ResponseCode.InvalidArgument,
                message: 'invalid argument: task is not a list of string',
                data: null,
            };
            res.status(responseCodeToStatus(ResponseCode.InvalidArgument)).json(
                response,
            );
            throw new DoNothingError('');
        }

        if (!isArrayOfStrings(taskString)) {
            const response: ResponseWrapper<null> = {
                code: ResponseCode.InvalidArgument,
                message: 'invalid argument: task is not a list of string',
                data: null,
            };
            res.status(responseCodeToStatus(ResponseCode.InvalidArgument)).json(
                response,
            );
            throw new DoNothingError('');
        }

        const tasks: string[] = JSON.parse(taskString);
        if (!arrayHasAllowedValues(tasks, allowedTaskNames)) {
            const response: ResponseWrapper<null> = {
                code: ResponseCode.InvalidArgument,
                message: 'invalid argument: one of task element is not valid',
                data: null,
            };
            res.status(responseCodeToStatus(ResponseCode.InvalidArgument)).json(
                response,
            );
            throw new DoNothingError('');
        }

        if (typeof walletAddress !== 'string') {
            const response: ResponseWrapper<null> = {
                code: ResponseCode.InvalidArgument,
                message: 'invalid argument: walletAddress is not string',
                data: null,
            };
            res.status(responseCodeToStatus(ResponseCode.InvalidArgument)).json(
                response,
            );
            throw new DoNothingError('');
        }

        if (!isEvmAddress(walletAddress)) {
            const response: ResponseWrapper<null> = {
                code: ResponseCode.InvalidArgument,
                message: 'invalid argument: walletAddress is not evm address',
                data: null,
            };
            res.status(responseCodeToStatus(ResponseCode.InvalidArgument)).json(
                response,
            );
            throw new DoNothingError('');
        }

        const provider = new ethers.JsonRpcProvider(env.METIS_RPC);
        const contract = new ethers.Contract(
            env.CONTRACT_ADDRESS,
            abi,
            provider,
        );

        const uniqueTasks = [...new Set(tasks)];

        const promises = uniqueTasks.map(async task => {
            if (task === 'stake') {
                const totalMetisStaked: bigint =
                    await contract.totalMetisStaked(walletAddress);
                const success = totalMetisStaked >= ONE_METIS;
                return [task, success];
            }
            // We already made sure all values in task are valid.
            // this is kept for typescript
            throw new Error("One of the tasks is invalid");
        });
        const resolved = await Promise.all(promises);
        const responseData = Object.fromEntries(resolved);

        const response: ResponseWrapper<any> = {
            code: ResponseCode.Success,
            message: 'success',
            data: responseData,
        };
        res.status(responseCodeToStatus(ResponseCode.Success)).json(response);
    } catch (e) {
        if (e instanceof DoNothingError) {
        } else {
            const response: ResponseWrapper<null> = {
                code: ResponseCode.InvalidArgument, // default to InvalidArgument
                message: 'invalid argument',
                data: null,
            };
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(response);
        }
    }
});

export { taskRouter };
