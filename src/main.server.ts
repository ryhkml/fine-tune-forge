import { bootstrapApplication } from "@angular/platform-browser";

import { AppComponent } from "./app/app.component";

import { mergeAppConfig } from "./app/app.config.server";

const bootstrap = () => bootstrapApplication(AppComponent, mergeAppConfig);

export default bootstrap;