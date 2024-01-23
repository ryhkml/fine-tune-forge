import { NextFunction, Request, Response } from "express";
import { take } from "rxjs";

import { addOpenAIDataset, downloadDataset, getInstructionState, getAllDataset, getDataset, removeDataset, removeInstructionState, replaceDataset, saveInstructionState } from "server/services/jsonl.service";

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
    downloadDataset(req.params["name"]).pipe(
        take(1)
    )
    .subscribe({
        next: ([filepath, filename]) => res.set({
            "Content-Type": "application/jsonl",
            "Content-Disposition": `attachment; filename="${filename}"`
        }).download(filepath),
        error: e => res.status(e.statusCode).json({ status: "ERROR", payload: String(e) })
    });
}

export function removeDatasetController(req: Request, res: Response, _: NextFunction) {
    removeDataset(req.params["name"]).pipe(
        take(1)
    )
    .subscribe({
        next: () => res.status(200).json({ status: "DONE", payload: null })
    });
}

export function getDatasetController(req: Request, res: Response, __: NextFunction) {
    getDataset(req.params["name"]).pipe(
        take(1)
    )
    .subscribe({
        next: v => res.status(200).json({ status: "DONE", payload: v })
    });
}

export function getAllDatasetController(_: Request, res: Response, __: NextFunction) {
    getAllDataset().pipe(
        take(1)
    )
    .subscribe({
        next: v => res.status(200).json({ status: "DONE", payload: v }),
        error: () => res.status(200).json({ status: "DONE", payload: [] })
    });
}

export function replaceDatasetController(req: Request, res: Response, _: NextFunction) {
    replaceDataset(req.params["name"], req.body["content"]).pipe(
        take(1)
    )
    .subscribe({
        next: v => res.status(200).json({ status: "DONE", payload: v }),
        error: e => res.status(e.statusCode).json({ status: "ERROR", payload: String(e) })
    });
}

export function getInstructionStateController(_: Request, res: Response, __:NextFunction) {
    getInstructionState().pipe(
        take(1)
    )
    .subscribe({
        next: v => res.status(200).json({ status: "DONE", payload: v }),
        error: e => res.status(e.statusCode).json({ status: "ERROR", payload: String(e) })
    });
}

export function saveInstructionStateController(req: Request, res: Response, _:NextFunction) {
    saveInstructionState(req.body["content"]).pipe(
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