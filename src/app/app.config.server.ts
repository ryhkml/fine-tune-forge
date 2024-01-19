import { mergeApplicationConfig, ApplicationConfig } from "@angular/core";
import { provideNoopAnimations } from "@angular/platform-browser/animations";

import { provideServerRendering } from "@angular/platform-server";

import { appConfig } from "./app.config";

import { en_US, provideNzI18n } from "ng-zorro-antd/i18n";

const serverConfig: ApplicationConfig = {
    providers: [
        provideServerRendering(),
        provideNoopAnimations(),
        provideNzI18n(en_US)
    ]
};

export const mergeAppConfig = mergeApplicationConfig(appConfig, serverConfig);