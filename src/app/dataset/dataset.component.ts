import { Component, HostListener, OnDestroy, OnInit, inject } from "@angular/core";
import { UpperCasePipe } from "@angular/common";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";

import { NzAlertModule } from "ng-zorro-antd/alert";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzTypographyModule } from "ng-zorro-antd/typography";

import { Subscription, debounceTime, distinctUntilChanged, map, noop, switchMap } from "rxjs";

import { DatasetService } from "./dataset.service";
import { ResolveDataset } from "./dataset.resolver";

@Component({
    selector: "app-dataset",
    standalone: true,
    imports: [
        RouterModule,
        ReactiveFormsModule,
        NzAlertModule,
        NzButtonModule,
        NzInputModule,
        NzTypographyModule,
        UpperCasePipe
    ],
    providers: [
        DatasetService
    ],
    templateUrl: "./dataset.component.html",
    styleUrl: "./dataset.component.less"
})
export class DatasetComponent implements OnInit, OnDestroy {

    name = "";

    alertType: "info" | "warning" = "info";
    alertMessage = "You can edit the dataset above. The dataset will automatically update if there are any changes.";

    readonly editorFormGroup = new FormGroup({
        dataset: new FormControl("", {
            nonNullable: true,
            validators: [
                Validators.required
            ]
        })
    });

    #datasetSubscription: Subscription | null = null;

    readonly #dataset = this.editorFormGroup.get("dataset")!;

    readonly #route = inject(ActivatedRoute);
    readonly #datasetService = inject(DatasetService);

    /**
     * @private
    */
    ngOnInit() {
        // 
        this.initDataset();
        // 
        this.initDatasetSubscription();
    }

    /**
     * @private
    */
    @HostListener("window:beforeunload")
    ngOnDestroy() {
        this.#datasetSubscription?.unsubscribe();
        this.#datasetSubscription = null;
    }

    private initDataset() {
        const { name, content } = this.#route.snapshot.data["dataset"] as ResolveDataset;
        this.name = name;
        if (content == "") {
            this.alertType = "warning";
            this.alertMessage = "Ensure that the dataset is created before attempting to make any edits, as it currently does not exist.";
            this.editorFormGroup.disable();
            return;
        }
        this.#dataset.patchValue(content, { emitEvent: false });
        this.#dataset.markAllAsTouched();
    }

    private initDatasetSubscription() {
        const { name, content } = this.#route.snapshot.data["dataset"] as ResolveDataset;
        if (content == "") {
            return;
        }
        this.#datasetSubscription = this.#dataset.valueChanges.pipe(
            distinctUntilChanged(),
            debounceTime(100),
            switchMap(v => this.#datasetService.replaceDataset(name, v).pipe(
                map(() => null)
            ))
        )
        .subscribe(noop);
    }
}