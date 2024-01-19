import { isPlatformServer } from "@angular/common";
import { Component, OnInit, PLATFORM_ID, inject } from "@angular/core";

import { RESPONSE } from "src/express.tokens";

@Component({
    selector: "app-error",
    standalone: true,
    templateUrl: "./error.component.html"
})
export class ErrorComponent implements OnInit {

    readonly #platformID = inject(PLATFORM_ID);
    readonly #res = inject(RESPONSE, { optional: true });

    ngOnInit() {
        if (isPlatformServer(this.#platformID)) {
            this.#res?.status(404).end();
        }
    }
}