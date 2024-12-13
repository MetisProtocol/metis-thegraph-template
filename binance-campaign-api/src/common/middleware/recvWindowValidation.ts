import { Request, Response, NextFunction } from 'express';

import {
    ResponseCode,
    responseCodeToStatus,
    ResponseWrapper,
} from '@/common/models/serviceResponse2';
import { StatusCodes } from 'http-status-codes';
import { DoNothingError } from '../utils/error';

function verifyAndTransformRecvWindow(recvWindowStr: any): bigint | null {
    if (typeof recvWindowStr !== 'string') {
        return null;
    }
    if (!/^\d+$/.test(recvWindowStr)) return null;
    const recvWindow = BigInt(recvWindowStr);
    if (recvWindow < 0) return null;
    return BigInt(recvWindow);
}

function verifyAndTransformTimestamp(timestampStr: any): bigint | null {
    if (typeof timestampStr !== 'string') {
        return null;
    }
    if (!/^\d+$/.test(timestampStr)) return null;
    const timestamp = BigInt(timestampStr);
    if (timestamp < 0) return null;
    return timestamp;
}

export function recvWindowValidation(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const recvWindow = verifyAndTransformRecvWindow(req.query.recvWindow);
        const timestamp = verifyAndTransformTimestamp(req.query.timestamp);

        if (recvWindow === null) {
            const response: ResponseWrapper<null> = {
                code: ResponseCode.InvalidArgument,
                message:
                    'invalid argument: recvWindow should be of type unsigned long',
                data: null,
            };
            res.status(responseCodeToStatus(ResponseCode.InvalidArgument)).json(
                response,
            );
            throw new DoNothingError('');
        }

        if (timestamp === null) {
            const response: ResponseWrapper<null> = {
                code: ResponseCode.InvalidArgument,
                message:
                    'invalid argument: timestamp should be of type unsigned long',
                data: null,
            };
            res.status(responseCodeToStatus(ResponseCode.InvalidArgument)).json(
                response,
            );
            throw new DoNothingError('');
        }

        const serverTime = BigInt(Date.now());

        // binance check
        if (recvWindow > 10000) {
            const response: ResponseWrapper<null> = {
                code: ResponseCode.InvalidRecvWindow,
                message:
                    'invalid recvWindow: recvWindow should be of less or equal to 10000',
                data: null,
            };
            res.status(
                responseCodeToStatus(ResponseCode.InvalidRecvWindow),
            ).json(response);
            throw new DoNothingError('');
        }

        if (
            serverTime - BigInt(3000) >= timestamp ||
            timestamp >= serverTime + BigInt(recvWindow)
        ) {
            const response: ResponseWrapper<null> = {
                code: ResponseCode.InvalidTimestamp,
                message:
                    'timestamp should be between serverTime - 3000 and serverTime + recvWindow',
                data: null,
            };
            res.status(
                responseCodeToStatus(ResponseCode.InvalidTimestamp),
            ).json(response);
            throw new DoNothingError('');
        }

        // Attach validated parameters to request object
        // req.body.recvWindow = recvWindow;
        // req.body.timestamp = timestamp;

        next();
    } catch (error) {
        if (error instanceof DoNothingError) {
        } else {
            const response: ResponseWrapper<null> = {
                code: ResponseCode.InvalidArgument, // default to InvalidArgument
                message: 'invalid argument',
                data: null,
            };
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(response);
        }
    }
}
