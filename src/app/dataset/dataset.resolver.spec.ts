import { TestBed } from "@angular/core/testing";

import { ResolveFn } from "@angular/router";

import { ResolveDataset, datasetResolver } from "./dataset.resolver";

describe("datasetResolver", () => {
    const executeResolver: ResolveFn<ResolveDataset> = (...resolverParameters) =>
        TestBed.runInInjectionContext(() => datasetResolver(...resolverParameters));

    beforeEach(() => {
        TestBed.configureTestingModule({});
    });

    it("should be created", () => {
        expect(executeResolver).toBeTruthy();
    });
});