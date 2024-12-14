import type { ErrorRequestHandler, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ResponseCode, ResponseWrapper } from '@/common/models/serviceResponse';

const unexpectedRequest: RequestHandler = (_req, res) => {
    const response: ResponseWrapper<null> = {
        code: ResponseCode.InvalidArgument,
        message: 'invalid argument',
        data: null,
    };
    res.status(StatusCodes.NOT_FOUND).send(response);
};

const addErrorToRequestLog: ErrorRequestHandler = (err, _req, res, next) => {
    res.locals.err = err;
    next(err);
};

export default () => [unexpectedRequest, addErrorToRequestLog];
