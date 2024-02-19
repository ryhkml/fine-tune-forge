import { ApplicationConfig } from "@angular/core";
import { registerLocaleData } from "@angular/common";
import { provideRouter, withEnabledBlockingInitialNavigation, withRouterConfig } from "@angular/router";
import { provideHttpClient, withFetch, withXsrfConfiguration, withInterceptors } from "@angular/common/http";
import { provideClientHydration } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";

import { routes } from "./app.routes";

import { httpInterceptor } from "./interceptors/http.interceptor";

import { provideNzConfig } from "ng-zorro-antd/core/config";
import { provideNzI18n } from "ng-zorro-antd/i18n";
import { en_US } from "ng-zorro-antd/i18n";

import en from "@angular/common/locales/en";

registerLocaleData(en);

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            routes,
            withRouterConfig({ resolveNavigationPromiseOnError: true }),
            withEnabledBlockingInitialNavigation()
        ),
        provideClientHydration(),
        provideHttpClient(
            withFetch(),
            withXsrfConfiguration({
                // WARNING!
                // Prefix your cookies on production with "__Host-"
                cookieName: "X-Ftf-Token",
                headerName: "X-Xftf-Cre"
            }),
            withInterceptors([
                httpInterceptor
            ])
        ),
        provideAnimations(),
        provideNzI18n(en_US),
        provideNzConfig({
            notification: {
                nzPauseOnHover: true,
                nzPlacement: "top",
                nzDuration: 5000,
                nzMaxStack: 5
            },
            space: {
                nzSize: 8
            }
        })
    ]
};