import { StatusCodes } from 'http-status-codes';
import { Response } from 'express';

// We can use a numeric enum or a string enum.
// Here we'll use string for direct mapping:
export enum ResponseCode {
    Success = '000000',
    TooManyRequests = '000001',
    SystemBusy = '000002',
    InvalidSignature = '000003',
    InvalidRecvWindow = '000004',
    InvalidTimestamp = '000005',
    InvalidArgument = '000006',
}

// Convert ResponseCode to an HTTP status code
export function responseCodeToStatus(code: ResponseCode): number {
    switch (code) {
        case ResponseCode.Success:
            return StatusCodes.OK; // 200
        case ResponseCode.TooManyRequests:
            return StatusCodes.TOO_MANY_REQUESTS; // 429
        case ResponseCode.SystemBusy:
            return StatusCodes.SERVICE_UNAVAILABLE; // 503
        case ResponseCode.InvalidSignature:
            return StatusCodes.UNAUTHORIZED; // 401
        case ResponseCode.InvalidRecvWindow:
            return StatusCodes.BAD_REQUEST; // 400
        case ResponseCode.InvalidTimestamp:
            return StatusCodes.BAD_REQUEST; // 400
        case ResponseCode.InvalidArgument:
            return StatusCodes.BAD_REQUEST; // 400
        default:
            return StatusCodes.INTERNAL_SERVER_ERROR;
    }
}

// Optional: reverse lookup by code string
export function responseCodeFromString(code: string): ResponseCode | null {
    switch (code) {
        case '000000':
            return ResponseCode.Success;
        case '000001':
            return ResponseCode.TooManyRequests;
        case '000002':
            return ResponseCode.SystemBusy;
        case '000003':
            return ResponseCode.InvalidSignature;
        case '000004':
            return ResponseCode.InvalidRecvWindow;
        case '000005':
            return ResponseCode.InvalidTimestamp;
        case '000006':
            return ResponseCode.InvalidArgument;
        default:
            return null;
    }
}

export interface ResponseWrapper<T> {
    code: ResponseCode;
    message: string;
    data: T;
}

/**
 * Send a response using our standardized format
 * @param res Express response object
 * @param wrapper ResponseWrapper object
 */
export function sendResponse<T>(res: Response, wrapper: ResponseWrapper<T>) {
    // Convert our code to an HTTP status code
    const status = responseCodeToStatus(wrapper.code);
    return res.status(status).json(wrapper);
}

/**
 * A helper to handle unexpected errors
 */
export function sendError(res: Response, errorMessage = 'Unexpected error') {
    const fallbackResponse: ResponseWrapper<string> = {
        code: ResponseCode.InvalidArgument,
        message: errorMessage,
        data: 'An unexpected error occurred.',
    };
    return res
        .status(responseCodeToStatus(fallbackResponse.code))
        .json(fallbackResponse);
}
