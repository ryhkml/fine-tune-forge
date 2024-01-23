import { TestBed } from "@angular/core/testing";
import { ResolveFn } from "@angular/router";

import { ResolveHome, homeResolver } from "./home.resolver";

describe("homeResolver", () => {
    const executeResolver: ResolveFn<ResolveHome> = (...resolverParameters) =>
        TestBed.runInInjectionContext(() => homeResolver(...resolverParameters));

    beforeEach(() => {
        TestBed.configureTestingModule({});
    });

    it("should be created", () => {
        expect(executeResolver).toBeTruthy();
    });
});