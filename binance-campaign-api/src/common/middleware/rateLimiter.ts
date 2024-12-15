import type { Request } from "express";
import { rateLimit } from "express-rate-limit";

import { env } from "@/common/utils/envConfig";
import { ResponseCode } from "../models/serviceResponse";

const rateLimiter = rateLimit({
    legacyHeaders: true,
    limit: env.COMMON_RATE_LIMIT_MAX_REQUESTS,
    message: {
        code: ResponseCode.TooManyRequests,
        message: 'Too many requests, please try again later.',
        data: null,
    },
    standardHeaders: true,
    windowMs: env.COMMON_RATE_LIMIT_WINDOW_MS,
    keyGenerator: (req: Request) => req.ip as string,
});

export default rateLimiter;
