import { Injector, PLATFORM_ID, inject } from "@angular/core";
import { DOCUMENT, isPlatformServer } from "@angular/common";
import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from "@angular/common/http";

import { REQUEST } from "src/express.tokens";

import { EMPTY, Observable, catchError, throwError } from "rxjs";
import { Request } from "express";

export const httpInterceptor: HttpInterceptorFn = (req, next) => {

    const isServer = isPlatformServer(inject(PLATFORM_ID));
    const document = inject(DOCUMENT);
    const injector = inject(Injector);

    const newReq = req.clone({
        withCredentials: true,
        setHeaders: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "User-Agent": document.defaultView!.navigator.userAgent
        }
    });

    if (isServer && !req.url.startsWith("//") && (req.url.startsWith("./") || req.url.startsWith("/")) ) {
        const serverReq = injector.get(REQUEST) as Request;
        const baseURL = serverReq.protocol + "://" + serverReq.get("Host");
        let endpoint = req.url;
        if (endpoint.startsWith(".")) {
            endpoint = endpoint.substring(1);
        }
        const newServerReq = newReq.clone({
            url: baseURL + endpoint
        });
        return next(newServerReq).pipe(
            catchHttpError()
        );
    }

    return next(newReq).pipe(
        catchHttpError()
    );
};

function catchHttpError() {
    return function(source: Observable<HttpEvent<unknown>>) {
        return source.pipe(
            catchError(e => {
                if (e instanceof HttpErrorResponse) {
                    if (e.status == 0 || e.statusText == "Unknown Error") {
                        return EMPTY;
                    }
                    return throwError(() => e);
                }
                return throwError(() => e);
            })
        );
    };
};