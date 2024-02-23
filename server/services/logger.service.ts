import chalk from "chalk";

export function logInfo(message: SafeAny) {
    const blue = chalk.hex("#52c41a");
    console.log(blue.bold("INFO:"), message, "—", today());
}

export function logWarn(message: SafeAny) {
    const yellow = chalk.hex("#faad14");
    console.log(yellow.bold("WARN:"), message, "—", today());
}

export function logError(message: SafeAny) {
    const red = chalk.hex("#ff4d4f");
    console.log(red.bold("ERROR:"), red(message), "—", today());
}

function today() {
    return new Date().toLocaleString();
}