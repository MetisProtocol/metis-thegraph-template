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
import { contract } from '@/common/utils/rpc';
import { authSignature } from '@/common/middleware/authSignature';
import { recvWindowValidation } from '@/common/middleware/recvWindowValidation';

const taskRouter = express.Router();
taskRouter.use(authSignature, recvWindowValidation);

const allowedTaskNames = ['stake'];

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

        const task: string[] = JSON.parse(taskString);
        if (!arrayHasAllowedValues(task, allowedTaskNames)) {
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

        const promises = task.map(async task => {
            if (task === 'stake') {
                const totalMetisStaked: bigint =
                    await contract.totalMetisStaked(walletAddress);
                console.log(totalMetisStaked);
                console.log(typeof totalMetisStaked);
                return totalMetisStaked.toString();
            }
            // We already made sure all values in task are valid.
            // this is kept for typescript
            return '0';
        });
        const resolved = await Promise.all(promises);

        const response: ResponseWrapper<string[]> = {
            code: ResponseCode.Success,
            message: 'success',
            data: resolved,
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
            console.log(e);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(response);
        }
    }
});

export { taskRouter };
