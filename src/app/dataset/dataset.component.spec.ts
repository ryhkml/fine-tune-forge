import { ComponentFixture, TestBed } from "@angular/core/testing";

import { DatasetComponent } from "./dataset.component";

describe("DatasetComponent", () => {
    let component: DatasetComponent;
    let fixture: ComponentFixture<DatasetComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DatasetComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(DatasetComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});