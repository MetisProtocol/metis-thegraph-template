export enum ResponseCode {
    Success = 'Success',
    Error = 'Error',
}

export interface ResponseWrapper<T> {
    code: ResponseCode;
    message: string;
    data: T;
}
