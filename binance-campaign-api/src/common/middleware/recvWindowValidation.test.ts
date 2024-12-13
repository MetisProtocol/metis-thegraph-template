import request from 'supertest';
import express, { Request, Response } from 'express';
import { recvWindowValidation } from './recvWindowValidation';
import {
    ResponseCode,
    responseCodeToStatus,
} from '@/common/models/serviceResponse2';

describe('recvWindowValidation middleware', () => {
    let app: express.Express;

    beforeEach(() => {
        app = express();
        // Use the middleware in a test route
        app.get(
            '/test',
            recvWindowValidation,
            (req: Request, res: Response) => {
                res.status(200).json({ message: 'success' });
            },
        );
    });

    it('should pass with valid recvWindow and timestamp', async () => {
        // Mock Date.now() to return a fixed time
        const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1000000000); // For example

        const recvWindow = '5000';
        const timestamp = '999997001'; // serverTime - 3000 = 999997000

        const response = await request(app)
            .get('/test')
            .query({ recvWindow, timestamp });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'success' });

        mockDateNow.mockRestore();
    });

    it('should return InvalidArgument if recvWindow is negative', async () => {
        const response = await request(app)
            .get('/test')
            .query({ recvWindow: '-5000', timestamp: '1000000000' });

        expect(response.status).toBe(
            responseCodeToStatus(ResponseCode.InvalidArgument),
        );
        expect(response.body.code).toBe(ResponseCode.InvalidArgument);
        expect(response.body.message).toBe(
            'invalid argument: recvWindow should be of type unsigned long',
        );
    });

    it('should return InvalidArgument if timestamp is negative', async () => {
        const response = await request(app)
            .get('/test')
            .query({ recvWindow: '5000', timestamp: '-1000000000' });

        expect(response.status).toBe(
            responseCodeToStatus(ResponseCode.InvalidArgument),
        );
        expect(response.body.code).toBe(ResponseCode.InvalidArgument);
        expect(response.body.message).toBe(
            'invalid argument: timestamp should be of type unsigned long',
        );
    });

    it('should return InvalidRecvWindow if recvWindow > 10000', async () => {
        const response = await request(app)
            .get('/test')
            .query({ recvWindow: '10001', timestamp: '1000000000' });

        expect(response.status).toBe(
            responseCodeToStatus(ResponseCode.InvalidRecvWindow),
        );
        expect(response.body.code).toBe(ResponseCode.InvalidRecvWindow);
        expect(response.body.message).toBe(
            'invalid recvWindow: recvWindow should be of less or equal to 10000',
        );
    });

    it('should return InvalidTimestamp if timestamp is out of valid range', async () => {
        const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1000000000);

        const recvWindow = '5000';
        const timestamp = '999996999'; // serverTime - 3001

        const response = await request(app)
            .get('/test')
            .query({ recvWindow, timestamp });

        expect(response.status).toBe(
            responseCodeToStatus(ResponseCode.InvalidTimestamp),
        );
        expect(response.body.code).toBe(ResponseCode.InvalidTimestamp);
        expect(response.body.message).toBe(
            'timestamp should be between serverTime - 3000 and serverTime + recvWindow',
        );

        mockDateNow.mockRestore();
    });

    it('should return InvalidArgument if recvWindow is not numeric', async () => {
        const response = await request(app)
            .get('/test')
            .query({ recvWindow: 'abc', timestamp: '1000000000' });

        expect(response.status).toBe(
            responseCodeToStatus(ResponseCode.InvalidArgument),
        );
        expect(response.body.code).toBe(ResponseCode.InvalidArgument);
        expect(response.body.message).toBe(
            'invalid argument: recvWindow should be of type unsigned long',
        );
    });

    it('should return InvalidArgument if timestamp is not numeric', async () => {
        const response = await request(app)
            .get('/test')
            .query({ recvWindow: '5000', timestamp: 'abc' });

        expect(response.status).toBe(
            responseCodeToStatus(ResponseCode.InvalidArgument),
        );
        expect(response.body.code).toBe(ResponseCode.InvalidArgument);
        expect(response.body.message).toBe(
            'invalid argument: timestamp should be of type unsigned long',
        );
    });

    it('should return InvalidArgument if recvWindow is missing', async () => {
        const response = await request(app)
            .get('/test')
            .query({ timestamp: '1000000000' });

        expect(response.status).toBe(
            responseCodeToStatus(ResponseCode.InvalidArgument),
        );
        expect(response.body.code).toBe(ResponseCode.InvalidArgument);
        expect(response.body.message).toBe(
            'invalid argument: recvWindow should be of type unsigned long',
        );
    });

    it('should return InvalidArgument if timestamp is missing', async () => {
        const response = await request(app)
            .get('/test')
            .query({ recvWindow: '5000' });

        expect(response.status).toBe(
            responseCodeToStatus(ResponseCode.InvalidArgument),
        );
        expect(response.body.code).toBe(ResponseCode.InvalidArgument);
        expect(response.body.message).toBe(
            'invalid argument: timestamp should be of type unsigned long',
        );
    });
});
