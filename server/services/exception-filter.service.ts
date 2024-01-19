import { SafeAny } from "server";

export class HttpException extends Error {
    
    statusCode;
    
    data;
    
    constructor(
        protected errMessage: string,
        protected errStatusCode = 500,
        protected errData?: { [f: string]: SafeAny }
    ) {
        super();
        this.message = errMessage;
        this.statusCode = errStatusCode;
        this.data = errData;
    }
}