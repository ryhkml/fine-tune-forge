import { NextFunction, Request, Response } from "express";

export function headerApi(_: Request, res: Response, next: NextFunction) {
    res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-XSS-Protection": "0"
    });
    next();
}