import { OptionLabelPipe } from "./option-label.pipe";

describe("OptionLabelPipe", () => {
    it("create an instance", () => {
        const pipe = new OptionLabelPipe();
        expect(pipe).toBeTruthy();
    });
});