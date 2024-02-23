import { Component, ElementRef, HostListener, OnDestroy, OnInit, QueryList, Renderer2, ViewChildren, inject } from "@angular/core";
import { UpperCasePipe } from "@angular/common";
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

@Component({
    selector: "app-dataset",
    standalone: true,
    imports: [
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
    baseModel = "" as BaseModel;

    editorJsonlFormControls = [] as Array<FormGroup<SafeAny>>;

    alertType: "error" | "info" | "warning" = "info";
    alertMessage = "You can edit the dataset below. The dataset will automatically update if there are any changes.";

    readonly editorJsonlFormGroup = new FormGroup<EditorJsonlFormGroup>({
        googlePalm2ChatBison: new FormArray<FormGroup<EditorGooglePalm2ChatBisonFormControls>>([]),
        googlePalm2TextBison: new FormArray<FormGroup<EditorGooglePalm2TextBisonFormControls>>([]),
        openaiGpt3: new FormArray<FormGroup<EditorOpenaiGpt3FormControls>>([])
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
                if (this.baseModel == "GOOGLE-PALM2-CHAT-BISON") {
                    this.googlePalm2ChatBison.at(index).reset(null!, { emitEvent: false });
                    this.googlePalm2ChatBison.at(index).disable();
                } else if (this.baseModel == "GOOGLE-PALM2-TEXT-BISON") {
                    this.googlePalm2TextBison.at(index).reset(null!, { emitEvent: false });
                    this.googlePalm2TextBison.at(index).disable();
                } else {
                    this.openaiGpt3.at(index).reset(null!, { emitEvent: false });
                    this.openaiGpt3.at(index).disable();
                }
                const tr = this.trRef.get(index)?.nativeElement as HTMLTableRowElement;
                tr.querySelectorAll("textarea").forEach(el => this.#renderer2.removeChild(el.parentElement, el));
                this.#renderer2.addClass(tr, "tr-readonly");
            }
        });
    }

    private initDatasetSubscription() {

        const { name, model, dataset } = this.#route.snapshot.data["dataset"] as ResolveDataset;

        this.name = name;

        if (model == null) {
            this.alertType = "error";
            this.alertMessage = "Invalid model.";
            this.editorJsonlFormGroup.disable({ emitEvent: false });
            return;
        }

        this.baseModel = model.toUpperCase() as BaseModel;

        if (dataset.length == 0) {
            this.alertType = "warning";
            this.alertMessage = "Ensure that the dataset is created before attempting to make any edits, as it currently does not exist.";
            this.editorJsonlFormGroup.disable({ emitEvent: false });
            return;
        }

        if (this.baseModel == "GOOGLE-PALM2-CHAT-BISON") {
            this.editorJsonlFormGroup.removeControl("googlePalm2TextBison");
            this.editorJsonlFormGroup.removeControl("openaiGpt3");
        } else if (this.baseModel == "GOOGLE-PALM2-TEXT-BISON") {
            this.editorJsonlFormGroup.removeControl("googlePalm2ChatBison");
            this.editorJsonlFormGroup.removeControl("openaiGpt3");
        } else {
            this.editorJsonlFormGroup.removeControl("googlePalm2ChatBison");
            this.editorJsonlFormGroup.removeControl("googlePalm2TextBison");
        }

        for (let i = 0; i < dataset.length; i++) {
            const item = dataset[i];
            if (this.baseModel == "GOOGLE-PALM2-TEXT-BISON") {
                const { input_text, output_text } = item as GooglePalm2TextBisonDataset;
                this.googlePalm2TextBison.push(
                    new FormGroup({
                        inputText: new FormControl(input_text, {
                            nonNullable: true
                        }),
                        outputText: new FormControl(output_text, {
                            nonNullable: true
                        }),
                        metadata: new FormGroup({
                            edit: new FormControl(false, {
                                nonNullable: true
                            })
                        })
                    }),
                    {
                        emitEvent: false
                    }
                );
            } else {
                const [instruction, user, assistant] = (item as OpenaiGpt3Dataset).messages;
                this.openaiGpt3.push(
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
                            })
                        }),
                        metadata: new FormGroup({
                            edit: new FormControl(false, {
                                nonNullable: true
                            })
                        })
                    }),
                    {
                        emitEvent: false
                    }
                );
            }
        }

        this.assignEditorFormGroup(this.baseModel);
        this.editorJsonlFormGroup.updateValueAndValidity({
            emitEvent: false
        });

        const sourceValueChanges$ = () => {
            if (this.baseModel == "GOOGLE-PALM2-TEXT-BISON") {
                return this.googlePalm2TextBison.controls.map(form => merge(
                    form.controls.inputText.valueChanges,
                    form.controls.outputText.valueChanges
                ));
            }
            return this.openaiGpt3.controls.map(form => merge(
                form.controls.messages.controls.instruction.valueChanges,
                form.controls.messages.controls.user.valueChanges,
                form.controls.messages.controls.assistant.valueChanges
            ));
        }

        this.#datasetSubscription = merge(...sourceValueChanges$()).pipe(
            switchMap(() => defer(() => {
                if (this.baseModel == "GOOGLE-PALM2-TEXT-BISON") {
                    return this.googlePalm2TextBison.valueChanges;
                }
                return this.openaiGpt3.valueChanges;
            })),
            debounceTime(100),
            map(item => {
                let newItem = [] as Array<{ [f: string]: any }>;
                if (this.baseModel == "GOOGLE-PALM2-TEXT-BISON") {
                    // @ts-ignore
                    newItem = item!.map(({ inputText, outputText }) => {
                        if (inputText && outputText) {
                            return {
                                input_text: inputText.replace(/"/g, '\"').trim(),
                                output_text: outputText.replace(/"/g, '\"').trim()
                            };
                        }
                        return {};
                    });
                } else {
                    // @ts-ignore
                    newItem = item!.map(({ messages }) => {
                        if (messages?.instruction && messages.user && messages.assistant) {
                            return {
                                messages: [
                                    {
                                        role: "system",
                                        content: messages.instruction.replace(/"/g, '\"').trim()
                                    },
                                    {
                                        role: "user",
                                        content: messages.user.replace(/"/g, '\"').trim()
                                    },
                                    {
                                        role: "assistant",
                                        content: messages.assistant.replace(/"/g, '\"').trim()
                                    }
                                ]
                            };
                        }
                        return {};
                    });
                }
                return newItem
                    .filter(item => this.hasObjectLength(item))
                    .map(item => {
                        return JSON.stringify(item)
                            .replace(/":/g, "\": ")
                            .replace(/",/g, "\", ")
                            .replace(/},/g, "}, ");
                    })
                    .join("\n");
            }),
            distinctUntilChanged(),
            switchMap(v => this.#datasetService.replaceDataset(this.baseModel, name, v).pipe(
                map(() => null)
            ))
        )
        .subscribe({
            next: () => {
                this.editorJsonlFormGroup.updateValueAndValidity({
                    emitEvent: false
                });
                this.assignEditorFormGroup(this.baseModel);
            }
        });
    }

    private setEditable(index: number) {
        if (this.baseModel == "GOOGLE-PALM2-CHAT-BISON") {
            this.googlePalm2ChatBison.at(index).get("metadata")?.get("edit")?.patchValue(true, {
                emitEvent: false
            });
        } else if (this.baseModel == "GOOGLE-PALM2-TEXT-BISON") {
            this.googlePalm2TextBison.at(index).get("metadata")?.get("edit")?.patchValue(true, {
                emitEvent: false
            });
        } else {
            this.openaiGpt3.at(index).get("metadata")?.get("edit")?.patchValue(true, {
                emitEvent: false
            });
        }
    }

    private removeEditable(index: number) {
        if (this.baseModel == "GOOGLE-PALM2-CHAT-BISON") {
            this.googlePalm2ChatBison.at(index).get("metadata")?.get("edit")?.patchValue(false, {
                emitEvent: false
            });
        } else if (this.baseModel == "GOOGLE-PALM2-TEXT-BISON") {
            this.googlePalm2TextBison.at(index).get("metadata")?.get("edit")?.patchValue(false, {
                emitEvent: false
            });
        } else {
            this.openaiGpt3.at(index).get("metadata")?.get("edit")?.patchValue(false, {
                emitEvent: false
            });
        }
    }

    private hasEditable(index: number) {
        if (this.baseModel == "GOOGLE-PALM2-CHAT-BISON") {
            return !!this.googlePalm2ChatBison.at(index).get("metadata")?.get("edit")?.value;
        }
        if (this.baseModel == "GOOGLE-PALM2-TEXT-BISON") {
            return !!this.googlePalm2TextBison.at(index).get("metadata")?.get("edit")?.value;
        }
        return !!this.openaiGpt3.at(index).get("metadata")?.get("edit")?.value;
    }

    private hasObjectLength(object: { [f: string]: any }) {
        return !!Object.keys(object).length;
    }

    private assignEditorFormGroup(model: BaseModel) {
        if (model == "GOOGLE-PALM2-CHAT-BISON") {
            this.editorJsonlFormControls = this.googlePalm2ChatBison.controls;
        } else if (model == "GOOGLE-PALM2-TEXT-BISON") {
            this.editorJsonlFormControls = this.googlePalm2TextBison.controls;
        } else {
            this.editorJsonlFormControls = this.openaiGpt3.controls;
        }
    }

    private get googlePalm2ChatBison() {
        return this.editorJsonlFormGroup.get("googlePalm2ChatBison") as FormArray<FormGroup<EditorGooglePalm2ChatBisonFormControls>>;
    }

    private get googlePalm2TextBison() {
        return this.editorJsonlFormGroup.get("googlePalm2TextBison") as FormArray<FormGroup<EditorGooglePalm2TextBisonFormControls>>;
    }

    private get openaiGpt3() {
        return this.editorJsonlFormGroup.get("openaiGpt3") as FormArray<FormGroup<EditorOpenaiGpt3FormControls>>;
    }
}