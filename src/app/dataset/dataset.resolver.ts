import { inject } from "@angular/core";
import { ResolveFn } from '@angular/router';

import { DatasetService } from "./dataset.service";
import { map } from "rxjs";

export type ResolveDataset = {
    name: string;
    content: string;
}

export const datasetResolver: ResolveFn<ResolveDataset> = (route, _) => {
    const name = route.paramMap.get("name") || "";
    const datasetService = inject(DatasetService);
    return datasetService.getDataset(name).pipe(
        map(content => ({ name, content }))
    );
};