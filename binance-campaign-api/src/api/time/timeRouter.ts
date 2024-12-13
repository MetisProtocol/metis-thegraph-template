import { Router, Request, Response } from 'express';
import {
    ResponseCode,
    responseCodeToStatus,
    ResponseWrapper,
} from '@/common/models/serviceResponse2';

const timeRouter = Router();

timeRouter.get('/', (req: Request, res: Response) => {
    const serverTime = Date.now(); // milliseconds since UNIX epoch
    const response: ResponseWrapper<number> = {
        code: ResponseCode.Success,
        message: 'success',
        data: serverTime,
    };
    const responseCode = responseCodeToStatus(ResponseCode.Success);
    res.status(responseCode).json(response);
});

export { timeRouter };
