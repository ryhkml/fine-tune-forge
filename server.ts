import "zone.js/node";

import { APP_BASE_HREF } from "@angular/common";
import { CommonEngine } from "@angular/ssr";

import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:https";
import { join } from "node:path";
import { cwd } from "node:process";

import { express as expressUserAgent } from "express-useragent";
import { BehaviorSubject } from "rxjs";
import { config } from "dotenv";
import { json } from "body-parser";
import { mw } from "request-ip";

import * as express from "express";
import * as compression from "compression";
import * as cookieParser from "cookie-parser";
import * as csurf from "csurf";

import { getAllDatasetController, addDatasetController, downloadDatasetController, removeDatasetController, getInstructionStateController, saveInstructionStateController, removeInstructionStateController, getDatasetController, replaceDatasetController } from "server/controller/jsonl.controller";
import { imageOCRController } from "server/controller/document-ocr.controller";
import { exceptionToken } from "server/middlewares/exception-token.middleware";
import { imageOCRUpload } from "server/middlewares/multer.middleware";
import { headerApi } from "server/middlewares/header-api.middleware";
import { logInfo } from "server/services/logger.service";

import { REQUEST, RESPONSE } from "./src/express.tokens";

import bootstrap from "./src/main.server";

export const env = new BehaviorSubject<EnvVar>({});

export function app() {
    const server = express();
    const browserDir = join(cwd(), "dist/fine-tune-forge/browser");
    const indexHtml = existsSync(join(browserDir, "index.original.html"))
        ? join(browserDir, "index.original.html")
        : join(browserDir, "index.html");

    const commonEngine = new CommonEngine();

    server.set("view engine", "html");
    server.set("views", browserDir);
    server.set("trust proxy", true);

    server.disable("x-powered-by");

    const {
        COOKIE_PARSER_SECRET_KEY,
        CSRF_KEY
    } = env.getValue();

    // Middlewares
    server.use((_, res, next) => {
        res.set({
            "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400 immutable",
            "Permissions-Policy": "camera=(), microphone=(), interest-cohort=()",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block"
        });
        next();
    });
    server.use(compression({
        filter: (req, _,) => {
            if (req.path.includes("/scan/images")) {
                return false;
            }
            return true;
        }
    }));
    server.use(json({
        limit: 95 * 1024 * 1024
    }));
    server.use(cookieParser(COOKIE_PARSER_SECRET_KEY));
    server.use(csurf({
        cookie: {
            sameSite: "strict",
            httpOnly: true,
            secure: CSRF_KEY.includes("__Host-"),
            signed: CSRF_KEY.includes("__Host-"),
            key: CSRF_KEY || "_CSRF"
        },
        value: req => String(req.headers["x-xftf-cre"])
    }));
    server.use((req, res, next) => {
        res.cookie("X-Ftf-Token", req.csrfToken(), {
            sameSite: "strict",
            secure: CSRF_KEY.includes("__Host-")
        });
        next();
    });
    server.use(expressUserAgent());
    server.use(mw());
    server.use(exceptionToken);

    // Controller
    server.get("/dataset", getAllDatasetController);
    server.get("/dataset/:model/:name", getDatasetController);
    server.patch("/dataset/:model/:name", [headerApi], replaceDatasetController);
    server.post("/add/dataset", [headerApi], addDatasetController);
    server.post("/download/dataset/:model/:name", [headerApi], downloadDatasetController);
    server.delete("/dataset/:model/:name", [headerApi], removeDatasetController);
    // 
    server.get("/instruction", getInstructionStateController);
    server.post("/save/instruction", [headerApi], saveInstructionStateController);
    server.delete("/instruction", [headerApi], removeInstructionStateController);
    // 
    server.post("/scan/images", [headerApi, imageOCRUpload], imageOCRController);

    // Example Express Rest API endpoints
    // server.get("/api/**", (req, res) => { });
    // Serve static files from /browser
    server.get("*.*", express.static(browserDir, {
        maxAge: "1y"
    }));

    // All regular routes use the Angular engine
    server.get("*", (req, res, next) => {
        const { protocol, originalUrl, baseUrl, headers } = req;
        commonEngine
            .render({
                bootstrap,
                documentFilePath: indexHtml,
                url: `${protocol}://${headers.host}${originalUrl}`,
                publicPath: browserDir,
                providers: [
                    { provide: APP_BASE_HREF, useValue: baseUrl },
                    { provide: RESPONSE, useValue: res },
                    { provide: REQUEST, useValue: req }
                ]
            })
            .then(html => res.send(html))
            .catch(e => next(e));
    });

    return server;
}

function saveEnv() {
    let envState: EnvVar | null = {};
    const filepath = process.env["PATH_ENV_VAR"];
    if (filepath) {
        config({
            processEnv: envState,
            path: filepath
        });
    } else {
        config({ processEnv: envState });
    }
    env.next(envState);
    logInfo("Env var saved!");
    // Cleanup
    envState = null;
}

function run() {
    const port = Math.abs(Number(process.env["PORT"])) || 12400;
    const https = process.env["PROTOCOL_SERVER"] == "https";
    if (https) {
        const server = createServer({
            cert: readFileSync(join(cwd(), "tls/fullchain.pem")),
            key: readFileSync(join(cwd(), "tls/cert-key.pem")),
            ca: readFileSync(join(cwd(), "tls/ca.crt"))
        }, app());
        server.listen(port, () => logInfo("Secure server listening on https://127.0.0.1:" + port));
    } else {
        const server = app();
        server.listen(port, () => logInfo("Server listening on http://127.0.0.1:" + port));
    }
}

saveEnv();
run();