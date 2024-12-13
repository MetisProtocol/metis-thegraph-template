import { Request, Response, NextFunction } from 'express';

import { env } from '@/common/utils/envConfig';
import {
    ResponseCode,
    responseCodeToStatus,
    ResponseWrapper,
} from '@/common/models/serviceResponse2';
import { loadRsaPublicKeyFromBase64, verify } from '@/common/utils/rsa';
import { StatusCodes } from 'http-status-codes';
import { DoNothingError } from '../utils/error';

// Middleware to authenticate signature
export function authSignature(req: Request, res: Response, next: NextFunction) {
    try {
        const signatureHeader = req.headers['signature'];
        if (!signatureHeader || Array.isArray(signatureHeader)) {
            const response: ResponseWrapper<null> = {
                code: ResponseCode.InvalidSignature,
                message: 'invalid signature',
                data: null,
            };
            res.status(
                responseCodeToStatus(ResponseCode.InvalidSignature),
            ).json(response);
            throw new DoNothingError('');
        }

        // Load your RSA public key from configuration or environment variable
        const publicKeyBase64 = env.RSA_PUBLIC_KEY_BASE64;
        const publicKey = loadRsaPublicKeyFromBase64(publicKeyBase64);

        // Get the raw query string
        const search = req.originalUrl.split('?')[1] || '';
        const decodedSearch = decodeURIComponent(search);

        const isVerified = verify(decodedSearch, publicKey, signatureHeader);

        if (!isVerified) {
            const response: ResponseWrapper<null> = {
                code: ResponseCode.InvalidSignature,
                message: 'invalid signature',
                data: null,
            };
            res.status(
                responseCodeToStatus(ResponseCode.InvalidSignature),
            ).json(response);
            throw new DoNothingError('');
        }

        // Signature is valid, proceed to next middleware
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
