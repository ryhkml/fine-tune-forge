import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";

import { map, of, take } from "rxjs";

@Injectable()
export class DatasetService {

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

    replaceDataset(model: string, name: string, content: string) {
        const path = ["dataset", model.toLowerCase(), name.toLowerCase()];
        return this.#http.patch("/" + path.join("/"), { content }).pipe(
            take(1)
        );
    }
}