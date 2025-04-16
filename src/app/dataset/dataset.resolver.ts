import { inject } from "@angular/core";
import { ResolveFn } from "@angular/router";

import { catchError, map, of } from "rxjs";

import { DatasetService } from "./dataset.service";

export const datasetResolver: ResolveFn<ResolveDataset> = (route, _) => {
	const models = ["GOOGLE-PALM2-CHAT-BISON", "GOOGLE-PALM2-TEXT-BISON", "OPENAI-GPT-3.5"];

	let model = route.paramMap.get("model") as BaseModel;

	if (!models.includes(model.toUpperCase())) {
		// @ts-ignore
		model = null;
	}

	const name = route.paramMap.get("name") || "";
	const datasetService = inject(DatasetService);

	return datasetService.getDataset(model, name).pipe(
		map((dataset) => ({
			name,
			model,
			dataset: dataset == "" ? [] : dataset.split("\n").map((item) => JSON.parse(item))
		})),
		catchError(() =>
			of({
				name,
				model,
				dataset: []
			})
		)
	);
};
