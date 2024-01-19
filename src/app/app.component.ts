import { Component, HostBinding } from "@angular/core";

import { RouterOutlet } from "@angular/router";

@Component({
    selector: "app-root",
    standalone: true,
    imports: [
        RouterOutlet
    ],
    templateUrl: "./app.component.html"
})
export class AppComponent {

    readonly title = "gpt-fine-tuning-creator";

    @HostBinding("attr.ng-version")
    readonly ngVersion = "0.0.0-placeholder";
}