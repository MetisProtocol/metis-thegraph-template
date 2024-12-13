import request from 'supertest';
import express from 'express';
import { taskRouter } from './taskRouter';
import {
    ResponseCode,
    responseCodeToStatus,
} from '@/common/models/serviceResponse';
import * as authSignatureModule from '@/common/middleware/authSignature';
import * as recvWindowValidationModule from '@/common/middleware/recvWindowValidation';
import * as checkers from '@/common/utils/checkers';

jest.mock('@/common/middleware/authSignature');
jest.mock('@/common/middleware/recvWindowValidation');
// jest.mock('@/common/utils/checkers')

jest.mock('@/common/utils/rpc', () => ({
    contract: {
        totalMetisStaked: jest.fn(_ => BigInt(10)), // eslint-disable-line
    },
}));

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('Task Router', () => {
    const app = express();
    app.use(express.json());
    app.use('/task', taskRouter);
    let someMock: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(authSignatureModule, 'authSignature').mockImplementation(
            (req, res, next) => next(),
        );
        jest.spyOn(
            recvWindowValidationModule,
            'recvWindowValidation',
        ).mockImplementation((req, res, next) => next());
        someMock = jest.spyOn(checkers, 'isArrayOfStrings');
    });

    it('should fail if task is not a list of strings', async () => {
        const res = await request(app).get('/task/completion').query({
            task: 'invalidtask',
            walletAddress: ZERO_ADDRESS,
        });

        expect(res.status).toBe(
            responseCodeToStatus(ResponseCode.InvalidArgument),
        );
        expect(res.body.code).toBe(ResponseCode.InvalidArgument);
        expect(res.body.message).toBe(
            'invalid argument: task is not a list of string',
        );
    });

    it('should fail if task contain invalid values', async () => {
        const res = await request(app).get('/task/completion').query({
            task: `["invalidTask"]`,
            walletAddress: '0x1234567890abcdef',
        });

        expect(res.status).toBe(
            responseCodeToStatus(ResponseCode.InvalidArgument),
        );
        expect(res.body.code).toBe(ResponseCode.InvalidArgument);
        expect(res.body.message).toBe(
            'invalid argument: one of task element is not valid',
        );
    });

    it('should fail if walletAddress is not a string', async () => {
        const res = await request(app)
            .get('/task/completion')
            .query({
                task: `["stake", "stake"]`,
                walletAddress: { a: 3 },
            });

        expect(res.status).toBe(
            responseCodeToStatus(ResponseCode.InvalidArgument),
        );
        expect(res.body.code).toBe(ResponseCode.InvalidArgument);
        expect(res.body.message).toBe(
            'invalid argument: walletAddress is not string',
        );
    });

    it('should fail if walletAddress is not a valid EVM address', async () => {
        const res = await request(app).get('/task/completion').query({
            task: `["stake", "stake"]`,
            walletAddress: 'invalidAddress',
        });

        expect(res.status).toBe(
            responseCodeToStatus(ResponseCode.InvalidArgument),
        );
        expect(res.body.code).toBe(ResponseCode.InvalidArgument);
        expect(res.body.message).toBe(
            'invalid argument: walletAddress is not evm address',
        );
    });

    it('should return 200 and the resolved data for valid inputs', async () => {
        const res = await request(app).get('/task/completion').query({
            task: `["stake", "stake"]`,
            walletAddress: ZERO_ADDRESS,
        });

        expect(res.status).toBe(responseCodeToStatus(ResponseCode.Success));
        expect(res.body.code).toBe(ResponseCode.Success);
        expect(res.body.message).toBe('success');
        expect(res.body.data).toEqual(['10', '10']);
    });

    it('should return 500 for unexpected errors', async () => {
        someMock.mockImplementation(() => {
            throw new Error('Unexpected error');
        });
        const res = await request(app).get('/task/completion').query({
            task: `["stake", "stake"]`,
            walletAddress: ZERO_ADDRESS,
        });

        expect(res.status).toBe(500);
        expect(res.body.code).toBe(ResponseCode.InvalidArgument);
        expect(res.body.message).toBe('invalid argument');
    });
});
