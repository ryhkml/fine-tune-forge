import { NextFunction, Request, Response } from "express";
import { take } from "rxjs";

import { scanImage } from "server/services/document-ocr.service";

export function imageOCRController(req: Request, res: Response, _: NextFunction) {
    const files = req.files as Array<Express.Multer.File>;
    scanImage(files).pipe(
        take(1)
    )
    .subscribe({
        next: v => res.status(200).json({ status: "DONE", payload: v }),
        error: e => res.status(e.statusCode).json({ status: "ERROR", payload: String(e) })
    });
}