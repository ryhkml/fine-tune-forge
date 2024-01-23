import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";

import { map, of, take } from "rxjs";

@Injectable()
export class DatasetService {

    readonly #http = inject(HttpClient);

    getDataset(name: string) {
        if (name == "") {
            return of("");
        }
        return this.#http.get<{ payload: string }>("/dataset/" + name).pipe(
            map(v => v.payload),
            take(1)
        );
    }

    replaceDataset(name: string, content: string) {
        return this.#http.patch("/dataset/" + name, { content }).pipe(
            take(1)
        );
    }
}