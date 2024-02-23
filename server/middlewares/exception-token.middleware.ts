import { NextFunction, Request, Response } from "express";

export function exceptionToken(err: SafeAny, _: Request, res: Response, next: NextFunction) {
    if (err["code"] == "EBADCSRFTOKEN") {
        return res.set({
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-XSS-Protection": "0"
        })
        .status(403).json({
            status: "ERROR",
            payload: "The server did not accept valid authentication"
        });
    }
    return next(err);
}