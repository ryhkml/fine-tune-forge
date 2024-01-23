import { DOCUMENT } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";

import { EMPTY, concat, map, switchMap, take } from "rxjs";

type AddDatasetPayload = {
    [f: string]: string | number | boolean;
}

@Injectable()
export class HomeService {

    readonly #document = inject(DOCUMENT);
    readonly #http = inject(HttpClient);

    getAllDataset() {
        return this.#http.get<{ payload: Array<string> }>("/dataset").pipe(
            map(v => v.payload),
            take(1)
        );
    }

    addDataset(payload: AddDatasetPayload) {
        return concat(
            this.#http.post<never>("/add/dataset", payload).pipe(
                switchMap(() => EMPTY)
            ),
            this.getAllDataset()
        )
        .pipe(
            take(1)
        );
    }

    downloadDataset(name: string) {
        return this.#http.post("/download/dataset/" + name, null, {
            responseType: "blob"
        })
        .pipe(
            map(v => this.#document.defaultView!.URL.createObjectURL(v)),
            take(1)
        );
    }

    removeDataset(name: string) {
        return this.#http.delete<{ status: string }>("/dataset/" + name).pipe(
            take(1)
        );
    }

    scanImage(payload: FormData) {
        return this.#http.post<{ payload: Array<string> }>("/scan/images", payload).pipe(
            map(v => {
                const extractedResults = v.payload;
                if (extractedResults.length == 1) {
                    return extractedResults[0];
                }
                let extractedTextState = "";
                for (let i = 0; i  < extractedResults.length; i++) {
                    const elementText = `/// ${i + 1} ///\n\n${extractedResults[i]}`;
                    if (i == (extractedResults.length - 1)) {
                        extractedTextState += elementText;
                    } else {
                        extractedTextState += elementText + "\n\n";
                    }
                }
                return extractedTextState;
            }),
            take(1)
        );
    }

    getInstructionState() {
        return this.#http.get<{ payload: string }>("/instruction").pipe(
            map(v => v.payload),
            take(1)
        );
    }

    saveInstructionState(content: string) {
        return this.#http.post("/save/instruction", { content }).pipe(
            take(1)
        );
    }

    removeInstructionState() {
        return this.#http.delete("/instruction").pipe(
            take(1)
        );
    }
}