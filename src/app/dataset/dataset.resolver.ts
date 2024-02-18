import { inject } from "@angular/core";
import { ResolveFn } from '@angular/router';

import { snakeCase, toUpper } from "lodash";
import { map } from "rxjs";

import { DatasetService } from "./dataset.service";

import { OpenAIDataset } from "server/services/jsonl.service";

export type ResolveDataset = {
    name: string;
    content: Array<OpenAIDataset>;
}

export const datasetResolver: ResolveFn<ResolveDataset> = (route, _) => {
    const name = route.paramMap.get("name") || "";
    const datasetService = inject(DatasetService);
    return datasetService.getDataset(name).pipe(
        map(content => ({
            name: toUpper(snakeCase(name)),
            content: content == ""
                ? [] as Array<OpenAIDataset>
                : content.split("\n").map(v => JSON.parse(v)) as Array<OpenAIDataset>
        }))
    );
};