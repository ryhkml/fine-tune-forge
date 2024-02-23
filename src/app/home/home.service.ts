import { DOCUMENT } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";

import { EMPTY, concat, map, of, switchMap, take } from "rxjs";

@Injectable()
export class HomeService {

    readonly #document = inject(DOCUMENT);
    readonly #http = inject(HttpClient);

    getDataset(model: string, name: string) {
        if (model == "" || name == "") {
            return of("");
        }
        const path = ["dataset", model.toLowerCase(), name.toLowerCase()];
        return this.#http.get<{ payload: string }>("/" + path.join("/")).pipe(
            map(v => v.payload),
            take(1)
        );
    }

    getAllDataset() {
        return this.#http.get<{ payload: Array<{ datasetNames: Array<string>, model: BaseModel }> }>("/dataset").pipe(
            map(v => v.payload),
            take(1)
        );
    }

    addDataset(payload: ReqJsonlPayload) {
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

    downloadDataset(model: string, name: string) {
        const path = ["download", "dataset", model.toLowerCase(), name.toLowerCase()];
        return this.#http.post("/" + path.join("/"), null, {
            responseType: "blob"
        })
        .pipe(
            map(v => this.#document.defaultView!.URL.createObjectURL(v)),
            take(1)
        );
    }

    removeDataset(model: string, name: string) {
        const path = ["dataset", model.toLowerCase(), name.toLowerCase()];
        return this.#http.delete<{ status: string }>("/" + path.join("/")).pipe(
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