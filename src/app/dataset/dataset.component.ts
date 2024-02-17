import { Component, ElementRef, HostListener, OnDestroy, OnInit, QueryList, Renderer2, ViewChildren, inject } from "@angular/core";
import { NgClass, UpperCasePipe } from "@angular/common";
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";

import { NzAlertModule } from "ng-zorro-antd/alert";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzModalModule, NzModalService } from "ng-zorro-antd/modal";
import { NzTableModule } from "ng-zorro-antd/table";
import { NzTypographyModule } from "ng-zorro-antd/typography";

import { Subscription, debounceTime, defer, distinctUntilChanged, map, merge, switchMap } from "rxjs";

import { DatasetService } from "./dataset.service";
import { ResolveDataset } from "./dataset.resolver";

type OpenAIPartDatasetFormControl = FormGroup<{
    instruction: FormControl<string>;
    user: FormControl<string>;
    assistant: FormControl<string>;
    metadata: FormGroup<{
        edit: FormControl<boolean>;
    }>;
}>

type OpenAIDatasetFormControl = {
    messages: OpenAIPartDatasetFormControl;
}

@Component({
    selector: "app-dataset",
    standalone: true,
    imports: [
        NgClass,
        RouterModule,
        ReactiveFormsModule,
        NzAlertModule,
        NzButtonModule,
        NzInputModule,
        NzModalModule,
        NzTableModule,
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

    stateControlList = [] as Array<FormGroup<OpenAIDatasetFormControl>>;

    alertType: "info" | "warning" = "info";
    alertMessage = "You can edit the dataset below. The dataset will automatically update if there are any changes.";

    readonly editorFormGroup = new FormGroup({
        state: new FormArray<FormGroup<OpenAIDatasetFormControl>>([])
    });

    #datasetSubscription: Subscription | null = null;

    readonly #route = inject(ActivatedRoute);
    readonly #renderer2 = inject(Renderer2);
    readonly #datasetService = inject(DatasetService);
    readonly #nzModalService = inject(NzModalService);

    @ViewChildren("trRef", { read: ElementRef })
    private readonly trRef!: QueryList<ElementRef<HTMLTableRowElement>>;

    /**
     * @private
    */
    ngOnInit() {
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

    editLineDataset(index: number) {
        const tr = this.trRef.get(index)?.nativeElement as HTMLTableRowElement;
        const textareaNodeList = tr.querySelectorAll("textarea");
        textareaNodeList.forEach(el => this.#renderer2.removeAttribute(el, "readonly"));
        this.setEditable(index);
    }

    editDone(index: number) {
        const tr = this.trRef.get(index)?.nativeElement as HTMLTableRowElement;
        const textareaNodeList = tr.querySelectorAll("textarea");
        textareaNodeList.forEach(el => this.#renderer2.setAttribute(el, "readonly", ""));
        this.removeEditable(index);
    }

    removeLine(index: number) {
        if (this.hasEditable(index)) {
            return;
        }
        this.#nzModalService.confirm({
            nzTitle: `Do you want to remove dataset <b>line ${index + 1}</b>?`,
            nzOkText: "REMOVE",
            nzIconType: undefined,
            nzClosable: false,
            nzOkDanger: true,
            nzCancelText: "CANCEL",
            nzCloseIcon: undefined,
            nzAutofocus: null,
            nzOnOk: () => {
                const messages = this.state.at(index).get("messages")!;
                messages.reset(null!);
                messages.disable();
                const tr = this.trRef.get(index)?.nativeElement as HTMLTableRowElement;
                tr.querySelectorAll("textarea").forEach(el => this.#renderer2.removeChild(el.parentElement, el));
                this.#renderer2.addClass(tr, "tr-readonly");
            }
        });
    }

    private initDatasetSubscription() {

        const { name, content } = this.#route.snapshot.data["dataset"] as ResolveDataset;

        this.name = name;

        if (content.length == 0) {
            this.alertType = "warning";
            this.alertMessage = "Ensure that the dataset is created before attempting to make any edits, as it currently does not exist.";
            this.editorFormGroup.disable();
            return;
        }

        for (let i = 0; i < content.length; i++) {
            const { messages } = content[i];
            const [instruction, user, assistant] = messages;
            this.state.push(
                new FormGroup({
                    messages: new FormGroup({
                        instruction: new FormControl(instruction.content, {
                            nonNullable: true
                        }),
                        user: new FormControl(user.content, {
                            nonNullable: true
                        }),
                        assistant: new FormControl(assistant.content, {
                            nonNullable: true
                        }),
                        metadata: new FormGroup({
                            edit: new FormControl(false, {
                                nonNullable: true
                            })
                        })
                    })
                }),
                {
                    emitEvent: false
                }
            );
        }

        this.state.updateValueAndValidity();
        this.stateControlList = this.state.controls;

        const sourceMessages$ = this.state.controls.map(form => form.controls.messages.valueChanges);
        this.#datasetSubscription = merge(...sourceMessages$).pipe(
            switchMap(() => defer(() => this.editorFormGroup.valueChanges)),
            debounceTime(100),
            map(({ state }) => {
                const datasetPartial = state!.map(({ messages }) => ({
                    messages: [
                        {
                            role: "system",
                            content: messages!.instruction!.replace(/"/g, '\"').trim()
                        },
                        {
                            role: "user",
                            content: messages!.user!.replace(/"/g, '\"').trim()
                        },
                        {
                            role: "assistant",
                            content: messages!.assistant!.replace(/"/g, '\"').trim()
                        }
                    ]
                }));
                return datasetPartial
                    .map(v => {
                        return JSON.stringify(v)
                            .replace(/":/g, "\": ")
                            .replace(/",/g, "\", ")
                            .replace(/},/g, "}, ");
                    })
                    .join("\n");
            }),
            distinctUntilChanged(),
            switchMap(v => this.#datasetService.replaceDataset(name, v).pipe(
                map(() => null)
            ))
        )
        .subscribe({
            next: () => {
                this.state.updateValueAndValidity();
                this.stateControlList = this.state.controls;
            }
        });
    }

    private setEditable(index: number) {
        this.state.at(index).get(["messages", "metadata", "edit"])?.patchValue(true, {
            emitEvent: false
        });
    }

    private removeEditable(index: number) {
        this.state.at(index).get(["messages", "metadata", "edit"])?.patchValue(false, {
            emitEvent: false
        });
    }

    private hasEditable(index: number) {
        return !!this.state.at(index).get(["messages", "metadata", "edit"])?.value;
    }

    private get state() {
        return this.editorFormGroup.get("state") as FormArray<FormGroup<OpenAIDatasetFormControl>>;
    }
}