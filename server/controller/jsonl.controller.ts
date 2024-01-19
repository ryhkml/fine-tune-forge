import { createReadStream, existsSync, readdir, rm } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

import { NextFunction, Request, Response } from "express";
import { take } from "rxjs";

import { addOpenAIDataset, existsInstructionState, removeInstructionState, writeInstructionState } from "server/services/jsonl.service";

export function addDatasetController(req: Request, res: Response, _: NextFunction) {
    addOpenAIDataset(req.body).pipe(
        take(1)
    )
    .subscribe({
        next: v => res.status(201).json({ status: v, payload: null }),
        error: e => res.status(e.statusCode).json({ status: "ERROR", payload: String(e) })
    });
}

export function downloadDatasetController(req: Request, res: Response, _: NextFunction) {
    const filepath = join(cwd(), "DATASET/" + req.params["name"]);
    if (existsSync(filepath)) {
        const stream = createReadStream(filepath);
        return stream.pipe(res).set({
            "Content-Type": "application/jsonl",
            "Content-Disposition": `attachment; filename="${req.params["name"]}"`
        });
    }
    return res.status(404).json({ status: "ERROR", payload: "Dataset not found" })
}

export function removeDatasetController(req: Request, res: Response, _: NextFunction) {
    const filepath = join(cwd(), "DATASET/" + req.params["name"]);
    return rm(filepath, { force: true }, e => {
        if (e) {
            return res.status(404).json({ status: "ERROR", payload: String(e) })
        }
        return res.status(200).json({ status: "DONE", payload: null });
    });
}

export function getAllDatasetController(_: Request, res: Response, __: NextFunction) {
    const filepath = join(cwd(), "DATASET");
    return readdir(filepath, (e, files) => {
        if (e) {
            return res.status(404).json({ status: "ERROR", payload: String(e) });
        }
        const listDataset = files
            .map(v => v.trim())
            .filter(v => !!v && v.includes(".jsonl"));
        return res.status(200).json({ status: "DONE", payload: listDataset });
    });
}

export function existsInstructionStateController(_: Request, res: Response, __:NextFunction) {
    existsInstructionState().pipe(
        take(1)
    )
    .subscribe({
        next: v => res.status(200).json({ status: "DONE", payload: v })
    });
}

export function writeInstructionStateController(req: Request, res: Response, _:NextFunction) {
    writeInstructionState(req.body).pipe(
        take(1)
    )
    .subscribe({
        next: v => res.status(201).json({ status: v, payload: null }),
        error: e => res.status(e.statusCode).json({ status: "ERROR", payload: String(e) })
    });
}

export function removeInstructionStateController(_: Request, res: Response, __:NextFunction) {
    removeInstructionState().pipe(
        take(1)
    )
    .subscribe({
        next: v => res.status(200).json({ status: v, payload: null }),
        error: e => res.status(e.statusCode).json({ status: "ERROR", payload: String(e) })
    });
}