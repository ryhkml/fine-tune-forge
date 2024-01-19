import { appendFile, chmod, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";

import { EMPTY, catchError, concat, defer, map, of, switchMap, throwError } from "rxjs";
import { snakeCase, toUpper } from "lodash";

import { HttpException } from "./exception-filter.service";

import { BaseModel } from "server";

type OpenAIPayload = {
    baseModel: BaseModel;
    name: string;
    instruction: string;
    user: string;
    assistant: string;
}

// type PaLM2ForTextPayload = {
//     baseModel: BaseModel;
//     name: string;
//     input: string;
//     output: string;
// }

type OpenAIDataset = {
    messages: [
        {
            role: "system";
            content: string;
        },
        {
            role: "user";
            content: string;
        },
        {
            role: "assistant";
            content: string;
        }
    ];
}

// type PaLM2ForTextDataset = {
//     input_text: string;
//     output_text: string;
// }

export function addOpenAIDataset({ name, instruction, user, assistant }: OpenAIPayload) {
    const dataset = JSON.stringify({
        messages: [
            {
                role: "system",
                content: instruction
                    .replace(/"/g, '\"')
                    .trim()
            },
            {
                role: "user",
                content: user
                    .replace(/"/g, '\"')
                    .trim()
            },
            {
                role: "assistant",
                content: assistant
                    .replace(/"/g, '\"')
                    .trim()
            }
        ]
    }, null, "")
        .replace(/":/g, "\": ")
        .replace(/",/g, "\", ")
        .replace(/},/g, "}, ");
    // Prevent empty "?" or "!"
    const userMark = user.substring(user.length - 1);
    const assistantMark = assistant.substring(assistant.length - 1);
    if (userMark != "?" && userMark != "!") {
        return throwError(() => new HttpException("At the end of the user content, it must contain either a (?) or an (!)", 400));
    }
    if (assistantMark == "?" || assistantMark == "!") {
        return throwError(() => new HttpException("At the conclusion of the assistant's content, it should be devoid of any symbols such as the (?) or (!)", 400));
    }
    const filename = snakeCase(name).toUpperCase() + ".jsonl";
    const filepath = join(cwd(), "DATASET/" + filename);
    return defer(() => readFile(filepath, { encoding: "utf-8" })).pipe(
        catchError(() => of("")),
        switchMap(datasetFile => {
            const chunks = datasetFile.split("\n").filter(v => !!v);
            // Dataset state is empty
            // Write new dataset
            if (datasetFile == "" || chunks.length == 0) {
                return defer(() => writeFile(filepath, dataset, { mode: "444" })).pipe(
                    map(() => "DONE")
                );
            }
            // Prevent duplicate content
            const datasetObj = JSON.parse(dataset) as OpenAIDataset;
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (toUpper(chunk) == toUpper(dataset)) {
                    return throwError(() => new HttpException("The dataset has already been added", 409));
                }
                const user = (JSON.parse(chunk) as OpenAIDataset).messages[1].content;
                const assistant = (JSON.parse(chunk) as OpenAIDataset).messages[2].content;
                if (toUpper(user) == toUpper(datasetObj.messages[1].content)) {
                    return throwError(() => new HttpException("The user content has already been added", 409));
                }
                if (toUpper(assistant) == toUpper(datasetObj.messages[2].content)) {
                    return throwError(() => new HttpException("The assistant content has already been added", 409));
                }
            }
            const addDataset$ = concat(
                defer(() => chmod(filepath, "664")).pipe(
                    switchMap(() => EMPTY)
                ),
                defer(() => appendFile(filepath, "\n" + dataset)).pipe(
                    switchMap(() => EMPTY)
                ),
                defer(() => chmod(filepath, "444")).pipe(
                    map(() => "DONE")
                )
            );
            return addDataset$.pipe(
                catchError(e => throwError(() => new HttpException(String(e))))
            );
        })
    );
}

type WriteInstructionPayload = {
    content: string;
}

const filepathInstructionState = join(cwd(), "DATATMP/instruction.state");

export function existsInstructionState() {
    return defer(() => readFile(filepathInstructionState, { encoding: "utf-8" })).pipe(
        catchError(() => of(""))
    );
}

export function writeInstructionState({ content }: WriteInstructionPayload) {
    return defer(() => writeFile(filepathInstructionState, content)).pipe(
        map(() => "DONE"),
        catchError(() => throwError(() => new HttpException("There was an error")))
    );
}

export function removeInstructionState() {
    return defer(() => rm(filepathInstructionState, { force: true })).pipe(
        map(() => "DONE"),
        catchError(() => throwError(() => new HttpException("There was an error")))
    );
}