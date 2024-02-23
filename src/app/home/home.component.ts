import { LowerCasePipe, NgClass } from "@angular/common";
import { Component, ElementRef, HostListener, OnDestroy, OnInit, Renderer2, RendererStyleFlags2, TemplateRef, ViewChild, inject } from "@angular/core";
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";

import { NzAlertModule } from "ng-zorro-antd/alert";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCheckboxModule } from "ng-zorro-antd/checkbox";
import { NzDividerModule } from "ng-zorro-antd/divider";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzImageModule } from "ng-zorro-antd/image";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzModalModule, NzModalService } from "ng-zorro-antd/modal";
import { NzNotificationModule, NzNotificationService } from "ng-zorro-antd/notification";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzSpaceModule } from "ng-zorro-antd/space";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzTypographyModule } from "ng-zorro-antd/typography";

import { Subscription, debounceTime, distinctUntilChanged, filter, map, noop, switchMap } from "rxjs";
import { defer as deferLD, snakeCase, toUpper, trim } from "lodash";

import { HomeService } from "./home.service";

import { TruncatePipe } from "../shared/truncate.pipe";

import { OptionLabelPipe } from "./option-label.pipe";

@Component({
    selector: "app-home",
    standalone: true,
    providers: [
        HomeService
    ],
    imports: [
        NgClass,
        RouterModule,
        ReactiveFormsModule,
        // Styles
        NzAlertModule,
        NzButtonModule,
        NzCheckboxModule,
        NzDividerModule,
        NzIconModule,
        NzImageModule,
        NzInputModule,
        NzModalModule,
        NzNotificationModule,
        NzSelectModule,
        NzSpaceModule,
        NzSpinModule,
        NzTypographyModule,
        // Pipes
        LowerCasePipe,
        TruncatePipe,
        OptionLabelPipe
    ],
    templateUrl: "./home.component.html",
    styleUrls: ["./home.component.less"]
})
export class HomeComponent implements OnInit, OnDestroy {

    selectListDatasetName: Array<SelectListDatasetName> = [];
    listDatasetName: Array<ListDatasetName> = [];

    generatorJsonlStatus = "IDLE";
    imageOcrStatus = "IDLE";

    imagesBase64: Array<{ id: string, src: string, name: string }> = [];
    files: Array<File> = [];

    readonly generatorJsonlFormGroup = new FormGroup<GeneratorJsonlFormGroup>({
        baseModel: new FormControl<BaseModel>("OPENAI-GPT-3.5", {
            nonNullable: true,
            validators: [
                Validators.required
            ]
        }),
        name: new FormGroup({
            select: new FormControl<string | null>(null, {
                validators: [
                    Validators.minLength(3),
                    Validators.maxLength(64),
                    Validators.required
                ]
            }),
            input: new FormControl("", {
                nonNullable: true,
                validators: [
                    Validators.minLength(3),
                    Validators.maxLength(64)
                ]
            })
        })
    });
    readonly imageOCRFormGroup = new FormGroup({
        removeNewLines: new FormControl({ value: false, disabled: true }, {
            nonNullable: true
        }),
        extractedText: new FormControl("", {
            nonNullable: true
        })
    });

    #extractedTextState = "";

    #baseModelSubscription: Subscription | null = null;
    #instructionSubscription: Subscription | null = null;
    #instructionSaveSubscription: Subscription | null = null;
    #removeNewLinesSubscription: Subscription | null = null;

    readonly #removeNewLines = this.imageOCRFormGroup.get("removeNewLines")!;
    readonly #extractedText = this.imageOCRFormGroup.get("extractedText")!;

    readonly #renderer2 = inject(Renderer2);
    readonly #route = inject(ActivatedRoute);
    readonly #host = inject(ElementRef<HTMLElement>);
    readonly #nzNotificationService = inject(NzNotificationService);
    readonly #nzModalService = inject(NzModalService);
    readonly #homeService = inject(HomeService);

    @ViewChild("fileRef", { read: ElementRef })
    private readonly fileRef!: ElementRef<HTMLInputElement>;
    @ViewChild("emptyRef")
    private readonly emptyRef!: TemplateRef<void>;

    /**
     * @private
    */
    ngOnInit() {
        const datasetSnapshot = this.#route.snapshot.data["home"]["collection"] as Array<ListDatasetName>;
        this.listDatasetName = datasetSnapshot;
        this.selectListDatasetName = datasetSnapshot.map(item => {
            const datasetNames = item.datasetNames.map(name => ({
                label: name,
                value: name
            }));
            return {
                model: item.model,
                datasetNames
            };
        });
        // 
        this.initBaseModelSubscription();
        this.addCustomNameValidators();
        // By default base model is GPT-3.5
        this.addOpenaiGpt3FormControls();
        this.generatorJsonlFormGroup.updateValueAndValidity({
            emitEvent: false
        });
        this.initInstructionSubscription();
        // Document AI
        this.initRemoveNewLinesSubscription();
    }

    /**
     * @private
    */
    @HostListener("window:beforeunload")
    ngOnDestroy() {
        this.#baseModelSubscription?.unsubscribe();
        this.#baseModelSubscription = null;

        this.#instructionSubscription?.unsubscribe();
        this.#instructionSubscription = null;

        this.#instructionSaveSubscription?.unsubscribe();
        this.#instructionSaveSubscription = null;

        this.#removeNewLinesSubscription?.unsubscribe();
        this.#removeNewLinesSubscription = null;
    }

    addDataset() {
        // 
        if (this.generatorJsonlStatus == "PROCESS" || this.generatorJsonlFormGroup.invalid) {
            return;
        }

        this.generatorJsonlStatus = "PROCESS";
        this.generatorJsonlFormGroup.disable({
            emitEvent: false
        });
        
        let payload = {};

        const model = this.baseModel.value;
        const name = this.nameSelect.value as string;

        if (model == "GOOGLE-PALM2-TEXT-BISON") {
            const { inputText, outputText } = this.googlePalm2TextBison.getRawValue();
            payload = {
                baseModel: model,
                name,
                inputText,
                outputText
            };
        } else {
            const { instruction, user, assistant } = this.openaiGpt3.getRawValue();
            payload = {
                baseModel: model,
                name,
                instruction: instruction.input,
                user,
                assistant
            };
        }

        this.#homeService.addDataset(payload).subscribe({
            next: v => {
                this.generatorJsonlStatus = "DONE";
                this.generatorJsonlFormGroup.enable({
                    emitEvent: false
                });
                this.listDatasetName = v;
                if (model == "GOOGLE-PALM2-TEXT-BISON") {
                    this.googlePalm2TextBison.get("outputText")?.reset();
                } else {
                    this.openaiGpt3.get("assistant")?.reset();
                }
                this.#nzNotificationService.success("Dataset has been added", this.emptyRef, {
                    nzCloseIcon: this.emptyRef
                });
            },
            error: e => {
                this.generatorJsonlStatus = "DONE";
                this.generatorJsonlFormGroup.enable({
                    emitEvent: false
                });
                const message = e.error.payload as string;
                this.#nzNotificationService.error(message, this.emptyRef, {
                    nzCloseIcon: this.emptyRef,
                    nzDuration: 7500
                });
            }
        });
    }

    downloadDataset(model: string, name: string) {
        this.#homeService.downloadDataset(model, name).subscribe({
            next: v => {
                const anchor = this.#renderer2.createElement("a") as HTMLAnchorElement;
                this.#renderer2.setAttribute(anchor, "href", v);
                this.#renderer2.setAttribute(anchor, "rel", "noopener noreferrer");
                this.#renderer2.setAttribute(anchor, "download", name + ".jsonl");
                this.#renderer2.setAttribute(anchor, "hidden", "");
                this.#renderer2.setStyle(anchor, "display", "none", RendererStyleFlags2.Important);
                this.#renderer2.appendChild(this.#host.nativeElement, anchor);
                deferLD(() => {
                    anchor.click();
                    deferLD(() => this.#renderer2.removeChild(this.#host.nativeElement, anchor));
                });
            },
            error: e => {
                const message = e.error.payload as string;
                this.#nzNotificationService.error(message, this.emptyRef, {
                    nzCloseIcon: this.emptyRef,
                    nzDuration: 7500
                });
            }
        });
    }

    removeDataset(model: string, name: string) {
        this.#nzModalService.confirm({
            nzTitle: `Do you want to remove <b>${name}</b> dataset?`,
            nzOkText: "REMOVE",
            nzIconType: undefined,
            nzClosable: false,
            nzOkDanger: true,
            nzCancelText: "CANCEL",
            nzCloseIcon: this.emptyRef,
            nzAutofocus: null,
            nzOnOk: () => {
                this.#homeService.removeDataset(model, name).subscribe({
                    next: () => {
                        if (this.baseModel.value == model) {
                            this.nameSelect.reset(null, { emitEvent: false });
                        }
                        this.listDatasetName = this.listDatasetName.map(item => {
                            item.datasetNames = item.datasetNames.filter(item => item != name);
                            return item;
                        });
                        this.selectListDatasetName = this.selectListDatasetName.map(item => {
                            item.datasetNames = item.datasetNames.filter(({ value }) => value != name);
                            return item;
                        });
                        this.#nzNotificationService.blank("Dataset has been removed", this.emptyRef, {
                            nzCloseIcon: this.emptyRef
                        });
                    }
                });
            }
        });
    }

    createDatasetName() {
        if (this.nameInput.hasError("incorrect")) {
            return;
        }
        const newName = toUpper(snakeCase(this.nameInput.value));
        const index = this.selectListDatasetName.findIndex(({ model }) => model == this.baseModel.value);
        if (index == -1) {
            this.selectListDatasetName.push({
                datasetNames: [{
                    label: newName,
                    value: newName
                }],
                model: this.baseModel.value
            });
        } else {
            this.selectListDatasetName[index].datasetNames.push({
                label: newName,
                value: newName
            });
        }
        this.selectListDatasetName = this.selectListDatasetName
            .sort((a, b) => a.model.localeCompare(b.model))
            .map(item => {
                const datasetNames = item.datasetNames.sort((a, b) => a.label.localeCompare(b.label));
                return {
                    model: item.model,
                    datasetNames
                };
            });
        this.nameInput.reset();
    }

    onImageSelected(event: Event) {
        if (this.files.length > 15 || this.imageOcrStatus == "SELECTED") {
            return;
        }
        const target = event.target as HTMLInputElement;
        if (target.files == null || target.files.length == 0 || target.files.length > 15 || target.value == "") {
            return;
        }
        const filetypesState = [
            "image/gif",
            "image/jpeg",
            "image/png",
            "image/webp"
        ];
        const MAX_SIZE = 19 * 1024 * 1024; // 19MB
        const idsState = this.files.map(fileState => fileState.name + fileState.size.toString());
        for (let i = 0; i < target.files.length; i++) {
            const file = target.files[i];
            if (!filetypesState.includes(file.type)) {
                this.#nzNotificationService.error(`Invalid file type (${file.name})`, this.emptyRef, {
                    nzCloseIcon: this.emptyRef,
                    nzDuration: 7500
                });
                break;
            }
            if (file.size > MAX_SIZE) {
                this.#nzNotificationService.error(`Invalid file size (${file.name})`, this.emptyRef, {
                    nzCloseIcon: this.emptyRef,
                    nzDuration: 7500
                });
                break;
            }
            if (idsState.includes(file.name + file.size.toString())) {
                this.#nzNotificationService.info(`File (${file.name}) is ready!`, this.emptyRef, {
                    nzCloseIcon: this.emptyRef
                });
                break;
            }
            this.files.push(file);
            // Read images
            const reader = new FileReader();
            try {
                reader.readAsDataURL(file);
                reader.addEventListener("load", () => {
                    const encoded = reader.result?.toString();
                    if (encoded) {
                        this.imagesBase64.push({
                            id: file.name + file.size.toString(),
                            src: encoded,
                            name: file.name
                        });
                    }
                }, { once: true });
            } catch (e) {
                reader.abort();
            }
        }
    }

    scanImage() {
        // 
        if (this.files.length == 0 || this.imageOcrStatus == "SELECTED" || this.imageOcrStatus == "DONE") {
            return;
        }

        this.imageOCRFormGroup.reset();

        this.imageOcrStatus = "SELECTED";
        this.fileRef.nativeElement.disabled = true;

        const formData = new FormData();

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            formData.append("files", file);
        }

        this.#homeService.scanImage(formData).subscribe({
            next: v => {
                this.fileRef.nativeElement.disabled = false;
                this.imageOcrStatus = "DONE";
                this.#extractedTextState = v;
                this.#extractedText.patchValue(v);
                // 
                this.#nzNotificationService.success("Image has been extracted", this.emptyRef, {
                    nzCloseIcon: this.emptyRef
                });
            },
            error: e => {
                this.fileRef.nativeElement.disabled = false;
                this.imageOcrStatus = "DONE";
                this.#extractedTextState = "";
                // 
                const message = e.error.payload as string;
                this.#nzNotificationService.error(message, this.emptyRef, {
                    nzCloseIcon: this.emptyRef,
                    nzDuration: 7500
                });
            }
        });
    }

    removeImage(id: string) {
        this.files = this.files.filter(fileState => fileState.name + fileState.size.toString() != id);
        if (this.imagesBase64.length) {
            this.imagesBase64 = this.imagesBase64.filter(imageState => imageState.id != id);
        }
        if (this.files.length == 0) {
            this.resetImage();
        }
    }

    resetImage() {
        this.files = [];
        this.imagesBase64 = [];
        this.imageOcrStatus = "IDLE";
        this.#extractedTextState = "";
        // 
        this.fileRef.nativeElement.disabled = false;
        this.fileRef.nativeElement.files = null;
        this.fileRef.nativeElement.value = "";
        this.fileRef.nativeElement.blur();
        // 
        this.#removeNewLines.patchValue(false);
        this.#removeNewLines.disable();
    }

    private addOpenaiGpt3FormControls() {
        this.generatorJsonlFormGroup.addControl("openaiGpt3", new FormGroup({
            instruction: new FormGroup({
                check: new FormControl(false, {
                    nonNullable: true
                }),
                input: new FormControl("", {
                    nonNullable: true,
                    validators: [
                        Validators.required,
                        Validators.minLength(1)
                    ]
                })
            }),
            user: new FormControl("", {
                nonNullable: true,
                validators: [
                    Validators.required,
                    Validators.minLength(1)
                ]
            }),
            assistant: new FormControl("", {
                nonNullable: true,
                validators: [
                    Validators.required,
                    Validators.minLength(1)
                ]
            })
        }));
    }

    private removeOpenaiGpt3FormControls() {
        this.generatorJsonlFormGroup.removeControl("openaiGpt3", {
            emitEvent: false
        });
    }

    private addGooglePalm2TextBisonFormControls() {
        this.generatorJsonlFormGroup.addControl("googlePalm2TextBison", new FormGroup({
            inputText: new FormControl("", {
                nonNullable: true,
                validators: [
                    Validators.required,
                    Validators.minLength(1)
                ]
            }),
            outputText: new FormControl("", {
                nonNullable: true,
                validators: [
                    Validators.required,
                    Validators.minLength(1)
                ]
            })
        }));
    }

    private removeGooglePalm2TextBisonFormControls() {
        this.generatorJsonlFormGroup.removeControl("googlePalm2TextBison", {
            emitEvent: false
        });
    }

    private addCustomNameValidators() {
        this.nameInput.addValidators(control => {
            const name = trim(toUpper(snakeCase(control.value)));
            const names = this.listDatasetName
                .filter(({ model }) => model == this.baseModel.value)
                .map(({ datasetNames }) => datasetNames)[0];
            if (names.length == 0) {
                return null;
            }
            const match = names.some(item => item == name);
            if (match) {
                return { incorrect: true };
            }
            return null;
        });
    }

    private initInstructionSubscription() {
        const instruction = this.#route.snapshot.data["home"]["instruction"] as string;
        const instructionCheck = this.openaiGpt3.get("instruction")?.get("check")! as AbstractControl<boolean>;
        const instructionInput = this.openaiGpt3.get("instruction")?.get("input")! as AbstractControl<string>;
        switch(instruction) {
            case "EMPTY":
                instructionCheck.patchValue(true, { emitEvent: false });
                instructionCheck.markAllAsTouched();
                break;
            case "UNAVAILABLE":
                noop();
                break;
            default:
                instructionInput.patchValue(instruction, { emitEvent: false });
                instructionInput.markAllAsTouched();
                instructionCheck.patchValue(true, { emitEvent: false });
                instructionCheck.markAllAsTouched();
        }
        instructionInput.addValidators(control => {
            const value = trim(control.value);
            if (toUpper(value) == "EMPTY" || toUpper(value) == "UNAVAILABLE") {
                return { incorrect: true };
            }
            return null;
        });
        this.#instructionSaveSubscription = instructionCheck.valueChanges.pipe(
            distinctUntilChanged(),
            switchMap(v => {
                if (v) {
                    return this.#homeService.saveInstructionState(instructionInput?.value || "").pipe(
                        map(() => v)
                    );
                }
                return this.#homeService.removeInstructionState().pipe(
                    map(() => v)
                );
            })
        )
        .subscribe({
            next: v => {
                if (v) {
                    this.#nzNotificationService.success("Generate JSONL", "Instruction storage has been enabled", {
                        nzCloseIcon: this.emptyRef
                    });
                } else {
                    this.#nzNotificationService.blank("Generate JSONL", "Instruction storage has been disabled", {
                        nzCloseIcon: this.emptyRef
                    });
                }
            }
        });
        this.#instructionSubscription = instructionInput.valueChanges.pipe(
            filter(() => !!instructionCheck.value && instructionInput.valid),
            debounceTime(100),
            switchMap(v => this.#homeService.saveInstructionState(v).pipe(
                map(() => null)
            ))
        )
        .subscribe(noop);
    }

    private initBaseModelSubscription() {
        const model = this.#route.snapshot.queryParamMap.get("model");
        if (model) {
            const match = this.listDatasetName.some(item => item.model == model);
            if (match) {
                this.baseModel.patchValue(model as BaseModel);
            }
        }
        this.#baseModelSubscription = this.baseModel.valueChanges.pipe(
            distinctUntilChanged()
        )
        .subscribe({
            next: model => {
                this.nameSelect.patchValue(null, { emitEvent: false });
                if (model == "GOOGLE-PALM2-CHAT-BISON") {
                    noop();
                } else if (model == "GOOGLE-PALM2-TEXT-BISON") {
                    this.#instructionSaveSubscription?.unsubscribe();
                    this.#instructionSaveSubscription = null;
                    this.#instructionSubscription?.unsubscribe();
                    this.#instructionSubscription = null;
                    this.removeOpenaiGpt3FormControls();
                    this.addGooglePalm2TextBisonFormControls();
                    this.generatorJsonlFormGroup.updateValueAndValidity({
                        emitEvent: false
                    });
                } else {
                    this.removeGooglePalm2TextBisonFormControls();
                    this.addOpenaiGpt3FormControls();
                    this.generatorJsonlFormGroup.updateValueAndValidity({
                        emitEvent: false
                    });
                    // Reinitialize
                    this.initInstructionSubscription();
                }
            }
        });
    }

    private initRemoveNewLinesSubscription() {
        this.#removeNewLinesSubscription = this.#removeNewLines.valueChanges.pipe(
            filter(() => !!this.#extractedTextState),
            map(v => {
                if (v) {
                    const copyText = this.#extractedTextState;
                    return copyText
                        .replace(/\r?\n|\r/g, " ")
                        .trim()
                        .replace(/\. ([a-z])/g, (_, p) => " " + p);
                }
                return this.#extractedTextState;
            }),
            filter(v => !!v)
        )
        .subscribe({
            next: v => this.#extractedText.patchValue(v)
        });
    }

    get baseModel() {
        return this.generatorJsonlFormGroup.get("baseModel")!;
    }

    get nameSelect() {
        return this.generatorJsonlFormGroup.get("name")?.get("select")!;
    }

    get nameInput() {
        return this.generatorJsonlFormGroup.get("name")?.get("input")!;
    }

    private get googlePalm2TextBison() {
        return this.generatorJsonlFormGroup.get("googlePalm2TextBison")! as FormGroup<GeneratorGooglePalm2TextBisonFormControls>;
    }

    private get openaiGpt3() {
        return this.generatorJsonlFormGroup.get("openaiGpt3")! as FormGroup<GeneratorOpenaiGpt3FormControls>;
    }
}