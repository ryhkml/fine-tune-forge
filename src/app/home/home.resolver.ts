import { inject } from "@angular/core";
import { ResolveFn } from "@angular/router";

import { forkJoin, map } from "rxjs";

import { HomeService } from "./home.service";

export const homeResolver: ResolveFn<ResolveHome> = (_, __) => {
    const homeService = inject(HomeService);
    return forkJoin([homeService.getAllDataset(), homeService.getInstructionState()]).pipe(
        map(([collection, instruction]) => ({ collection, instruction }))
    );
};