// Import necessary modules and dependencies
import request from 'supertest';
import express from 'express';
import { authSignature } from './authSignature';
import { ResponseCode } from '../models/serviceResponse';
import * as rsaUtils from '@/common/utils/rsa'; // Import the entire module

jest.mock('@/common/utils/rsa');

const app = express();
app.use(express.json());
app.use('/test', authSignature, (req, res) => {
    res.status(200).send({ message: 'Success' });
});

describe('authSignature Middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        process.env = {
            NODE_ENV: 'test',
        };
    });

    it('should return 401 for missing signature header', async () => {
        jest.spyOn(rsaUtils, 'verify').mockReturnValue(false);
        const response = await request(app).get('/test');
        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            code: ResponseCode.InvalidSignature,
            message: 'invalid signature',
            data: null,
        });
    });

    it('should return 401 for invalid signature format (array)', async () => {
        jest.spyOn(rsaUtils, 'verify').mockReturnValue(false);
        const response = await request(app)
            .get('/test')
            .set('signature', '[invalid]');
        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            code: ResponseCode.InvalidSignature,
            message: 'invalid signature',
            data: null,
        });
    });

    it('should return 401 for invalid signature verification', async () => {
        jest.spyOn(rsaUtils, 'verify').mockReturnValue(false);
        const response = await request(app)
            .get('/test?param=value')
            .set('signature', 'mocked-signature');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            code: ResponseCode.InvalidSignature,
            message: 'invalid signature',
            data: null,
        });
    });

    it('should return 500 for errors during processing', async () => {
        jest.spyOn(rsaUtils, 'verify').mockImplementation(() => {
            throw new Error('Some error');
        });

        const response = await request(app)
            .get('/test?param=value')
            .set('signature', 'mocked-signature');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            code: ResponseCode.InvalidArgument,
            message: 'invalid argument',
            data: null,
        });
    });

    it('should call next middleware for valid signature', async () => {
        jest.spyOn(rsaUtils, 'verify').mockReturnValue(true);

        const response = await request(app)
            .get('/test?param=value')
            .set('signature', 'mocked-signature');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'Success' });
    });
});
