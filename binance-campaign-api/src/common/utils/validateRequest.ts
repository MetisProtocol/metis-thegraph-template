// import type { NextFunction, Request, Response } from "express";
// import { StatusCodes } from "http-status-codes";
// import type { ZodError, ZodSchema } from "zod";

// import { ServiceResponse } from "@/common/models/serviceResponse";

// interface SmallRequest {
//   body?: any,
//   query?: any,
//   params?: any,
// }

// export const validateRequest = (schema: ZodSchema, req: SmallRequest) => {
//   schema.parse({ body: req.body, query: req.query, params: req.params });
//   return true;
// };
