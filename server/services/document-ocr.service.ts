import { readFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

import { Observable, catchError, defer, finalize, forkJoin, map, of, switchMap, throwError, toArray } from "rxjs";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { google } from "@google-cloud/documentai/build/protos/protos";

import { HttpException } from "./exception-filter.service";
import { logError } from "./logger.service";
import { env } from "server";

type IProcessReqRes = [
    google.cloud.documentai.v1.IProcessResponse,
    google.cloud.documentai.v1.IProcessRequest | undefined,
    {} | undefined
]

export function scanImage(files: Array<Express.Multer.File>) {
    const {
        GCP_PROJECT_ID,
        GCP_DOC_AI_PROCESSOR_CLIENT_EMAIL,
        GCP_DOC_AI_PROCESSOR_PRIVATE_KEY,
        GCP_DOC_AI_PROCESSOR_NAME
    } = env.getValue();
    const iProcessReq$ = defer(() => readFile(docFilepath(files[0].filename))).pipe(
        map(v => toIProcessReq(v, files[0].mimetype, GCP_DOC_AI_PROCESSOR_NAME)),
        toArray()
    );
    const bulkIProcessReq$ = files.map(({ filename, mimetype }) => {
        return defer(() => readFile(docFilepath(filename))).pipe(
            map(v => toIProcessReq(v, mimetype, GCP_DOC_AI_PROCESSOR_NAME))
        );
    });
    const sourceIProcessReq$ = files.length == 1
        ? iProcessReq$
        : forkJoin(bulkIProcessReq$);
    return sourceIProcessReq$.pipe(
        switchMap(payloads => {
            const client = new DocumentProcessorServiceClient({
                credentials: {
                    client_email: GCP_DOC_AI_PROCESSOR_CLIENT_EMAIL,
                    private_key: GCP_DOC_AI_PROCESSOR_PRIVATE_KEY
                },
                projectId: GCP_PROJECT_ID
            });
            if (payloads.length == 1) {
                return defer(() => client.processDocument(payloads[0])).pipe(
                    mapGetText(),
                    toArray()
                );
            }
            const bulkProcessDocument$ = payloads.map(payload => {
                return defer(() => client.processDocument(payload)).pipe(
                    mapGetText()
                );
            });
            return forkJoin(bulkProcessDocument$);
        }),
        catchError(e => throwError(() => new HttpException(String(e)))),
        finalize(() => {
            // Cleanup images
            for (let i = 0; i < files.length; i++) {
                const { filename } = files[i];
                rmSync(docFilepath(filename), { force: true });
            }
        })
    );
}

function mapGetText() {
    return function(source: Observable<IProcessReqRes>) {
        let paragraphTextState: string | null = null;
        return source.pipe(
            map(([v]) => {
                const { document } = v;
                const { text } = document!;
                const [firstPage] = v.document?.pages!;
                const { paragraphs } = firstPage;
                if (paragraphs && paragraphs.length) {
                    paragraphTextState = "";
                    for (let i = 0; i < paragraphs.length; i++) {
                        const paragraph = paragraphs[i];
                        const paragraphText = getText(paragraph.layout?.textAnchor, text);
                        if (paragraphText) {
                            paragraphTextState += paragraphText;
                        }
                    }
                    return paragraphTextState.trim();
                }
                return "";
            }),
            catchError(e => {
                const errMessage = String(e);
                logError(errMessage);
                return of(errMessage);
            }),
            finalize(() => paragraphTextState = null)
        );
    }
}

function toIProcessReq(v: Buffer, mimetype: string, name?: string | null) {
    const { GCP_DOC_AI_SKIP_HUMAN_REVIEW } = env.getValue();
    return {
        name,
        skipHumanReview: !!Number(GCP_DOC_AI_SKIP_HUMAN_REVIEW),
        rawDocument: {
            content: Buffer.from(v).toString("base64"),
            mimeType: mimetype
        }
    } as google.cloud.documentai.v1.IProcessRequest;
};

function docFilepath(name: string) {
    return join(cwd(), "DATADOC_OCR/" + name);
}

function getText(textAnchor: google.cloud.documentai.v1.Document.Page.ILayout["textAnchor"], text?: string | null) {
    // Extract shards from the text field
    if (!textAnchor?.textSegments || textAnchor.textSegments.length == 0) {
        return "";
    }
    // First shard in document doesn't have startIndex property
    const start = Number(textAnchor.textSegments[0].startIndex) || 0;
    const end = Number(textAnchor.textSegments[0].endIndex);
    return text?.substring(start, end);
}