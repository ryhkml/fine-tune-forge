import { appendFile, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

import { catchError, defer, forkJoin, map, Observable, of, switchMap, throwError } from "rxjs";
import { snakeCase, toUpper } from "lodash";

import { HttpException } from "./exception-filter.service";

export function addDataset(res: ResJsonlPayload) {
	if (res.baseModel == "GOOGLE-PALM2-TEXT-BISON") {
		return addGooglePalm2TextBisonDataset(res);
	}
	return addOpenaiGpt3Dataset(res);
}

export function getAllDataset() {
	const basepath = join(cwd(), "DATASET/");
	return defer(() => readdir(basepath, { encoding: "utf-8" })).pipe(
		map((dirs) => dirs.filter((dir) => dir != ".gitkeep")),
		switchMap((models) => {
			const sourceFiles$ = models.map((model) => {
				const filepath = join(cwd(), "DATASET/" + model);
				return defer(() => readdir(filepath, { encoding: "utf-8" })).pipe(
					catchError(() => of<Array<string>>([])),
					map((files) => ({
						datasetNames: files
							.filter((file) => !!file && file != ".gitkeep")
							.map((file) => file.replace(".jsonl", ""))
							.sort((a, b) => a.localeCompare(b)),
						model
					}))
				);
			});
			return forkJoin(sourceFiles$);
		})
	);
}

export function getDataset(model: string, name: string) {
	const filepath = join(cwd(), "DATASET/" + model.toUpperCase() + "/" + name.toUpperCase() + ".jsonl");
	return defer(() => readFile(filepath, { encoding: "utf-8" })).pipe(catchError(() => of("")));
}

export function replaceDataset(model: string, name: string, content: Array<string>) {
	const sourceStream$ = new Observable<string>((observer) => {
		const filepath = join(cwd(), "DATASET/" + model.toUpperCase() + "/" + name.toUpperCase() + ".jsonl");
		const writable = createWriteStream(filepath);
		if (content.length > 1) {
			for (let i = 0; i < content.length; i++) {
				const chunk = content[i];
				writable.write(chunk);
				if (i != content.length - 1) {
					writable.write("\n");
				}
			}
		} else {
			writable.write(content[0]);
		}
		writable.end();
		writable.on("error", (e) => observer.error(e));
		writable.on("close", () => {
			observer.next("DONE");
			observer.complete();
		});
	});
	return sourceStream$.pipe(catchError((e) => throwError(() => new HttpException(String(e)))));
}

export function downloadDataset(model: string, name: string) {
	const filepath = join(cwd(), "DATASET/" + model.toUpperCase() + "/" + name.toUpperCase() + ".jsonl");
	if (!existsSync(filepath)) {
		return throwError(() => new HttpException("Dataset unavailable", 404));
	}
	return forkJoin([of(filepath), of(name + ".jsonl")]);
}

export function removeDataset(model: string, name: string) {
	const filepath = join(cwd(), "DATASET/" + model.toUpperCase() + "/" + name.toUpperCase() + ".jsonl");
	return defer(() => rm(filepath, { force: true })).pipe(
		map(() => "DONE"),
		catchError(() => of("DONE"))
	);
}

const filepathInstructionState = join(cwd(), "DATATMP/instruction.state");

export function getInstructionState() {
	return defer(() => readFile(filepathInstructionState, { encoding: "utf-8" })).pipe(
		map((v) => {
			if (v) {
				return v;
			}
			return "EMPTY";
		}),
		catchError(() => of("UNAVAILABLE"))
	);
}

export function saveInstructionState(content: string) {
	return defer(() => writeFile(filepathInstructionState, content, { encoding: "utf-8" })).pipe(
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

function addGooglePalm2TextBisonDataset(res: ResJsonlPayload) {
	const singleDatasetLine = JSON.stringify(
		{
			input_text: res.inputText.replace(/"/g, '"').trim(),
			output_text: res.outputText.replace(/"/g, '"').trim()
		},
		null,
		""
	)
		.replace(/":/g, '": ')
		.replace(/",/g, '", ')
		.replace(/},/g, "}, ");
	const filename = snakeCase(res.name).toUpperCase() + ".jsonl";
	const filepath = join(cwd(), "DATASET/" + res.baseModel.toUpperCase() + "/" + filename);
	return defer(() => readFile(filepath, { encoding: "utf-8" })).pipe(
		catchError(() => of("")),
		switchMap((datasetLine) => {
			const chunks = datasetLine.split("\n").filter((v) => !!v);
			if (datasetLine == "" || chunks.length == 0) {
				return defer(() => writeFile(filepath, singleDatasetLine, { encoding: "utf-8" })).pipe(map(() => "DONE"));
			}
			const datasetObject = JSON.parse(singleDatasetLine) as GooglePalm2TextBisonDataset;
			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				if (toUpper(chunk) == toUpper(singleDatasetLine)) {
					return throwError(() => new HttpException("The dataset has already been added", 409));
				}
				const { input_text, output_text } = JSON.parse(chunk) as GooglePalm2TextBisonDataset;
				if (toUpper(input_text) == toUpper(datasetObject.input_text)) {
					return throwError(() => new HttpException("The user content has already been added", 409));
				}
				if (toUpper(output_text) == toUpper(datasetObject.output_text)) {
					return throwError(() => new HttpException("The assistant content has already been added", 409));
				}
			}
			return defer(() => appendFile(filepath, "\n" + singleDatasetLine, { encoding: "utf-8" })).pipe(
				map(() => "DONE"),
				catchError((e) => throwError(() => new HttpException(String(e))))
			);
		})
	);
}

function addOpenaiGpt3Dataset(res: ResJsonlPayload) {
	const singleDatasetLine = JSON.stringify(
		{
			messages: [
				{
					role: "system",
					content: res.instruction.replace(/"/g, '"').trim()
				},
				{
					role: "user",
					content: res.user.replace(/"/g, '"').trim()
				},
				{
					role: "assistant",
					content: res.assistant.replace(/"/g, '"').trim()
				}
			]
		},
		null,
		""
	)
		.replace(/":/g, '": ')
		.replace(/",/g, '", ')
		.replace(/},/g, "}, ");
	const filename = snakeCase(res.name).toUpperCase() + ".jsonl";
	const filepath = join(cwd(), "DATASET/" + res.baseModel.toUpperCase() + "/" + filename);
	return defer(() => readFile(filepath, { encoding: "utf-8" })).pipe(
		catchError(() => of("")),
		switchMap((datasetLine) => {
			const chunks = datasetLine.split("\n").filter((v) => !!v);
			// Dataset state is empty
			// Write new dataset
			if (datasetLine == "" || chunks.length == 0) {
				return defer(() => writeFile(filepath, singleDatasetLine, { encoding: "utf-8" })).pipe(map(() => "DONE"));
			}
			// Prevent duplicate content
			const datasetObj = JSON.parse(singleDatasetLine) as OpenaiGpt3Dataset;
			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				if (toUpper(chunk) == toUpper(singleDatasetLine)) {
					return throwError(() => new HttpException("The dataset has already been added", 409));
				}
				const user = (JSON.parse(chunk) as OpenaiGpt3Dataset).messages[1].content;
				const assistant = (JSON.parse(chunk) as OpenaiGpt3Dataset).messages[2].content;
				if (toUpper(user) == toUpper(datasetObj.messages[1].content)) {
					return throwError(() => new HttpException("The user content has already been added", 409));
				}
				if (toUpper(assistant) == toUpper(datasetObj.messages[2].content)) {
					return throwError(() => new HttpException("The assistant content has already been added", 409));
				}
			}
			return defer(() => appendFile(filepath, "\n" + singleDatasetLine, { encoding: "utf-8" })).pipe(
				map(() => "DONE"),
				catchError((e) => throwError(() => new HttpException(String(e))))
			);
		})
	);
}
