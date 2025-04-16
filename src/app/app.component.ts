import { Component, HostBinding, OnDestroy, OnInit } from "@angular/core";

import { RouterOutlet } from "@angular/router";

@Component({
	selector: "app-root",
	standalone: true,
	imports: [RouterOutlet],
	templateUrl: "./app.component.html"
})
export class AppComponent implements OnInit, OnDestroy {
	readonly title = "fine-tune-forge";

	@HostBinding("attr.ng-version")
	readonly ngVersion = "0.0.0-placeholder";

	ngOnInit(): void {}

	ngOnDestroy(): void {}
}
