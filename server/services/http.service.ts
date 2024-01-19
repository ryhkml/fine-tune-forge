import { Agent as httpsAgent } from "node:https"
import { Agent as httpAgent } from "node:http"

import axios from "axios";

export function httpRequest() {
    return axios.create({
        maxContentLength: 95 * 1024 * 1024,
        maxBodyLength: 95 * 1024 * 1024,
        maxRedirects: 8,
        timeout: 31000,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)"
        },
        transitional: {
            clarifyTimeoutError: true
        },
        httpAgent: new httpAgent({
            keepAlive: true
        }),
        httpsAgent: new httpsAgent({
            keepAlive: true
        })
    });
}