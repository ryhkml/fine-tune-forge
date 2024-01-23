import { NgClass } from "@angular/common";
import { Component, ElementRef, HostListener, OnDestroy, OnInit, Renderer2, RendererStyleFlags2, TemplateRef, ViewChild, inject } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";

import { NzAlertModule } from "ng-zorro-antd/alert";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCheckboxModule } from "ng-zorro-antd/checkbox";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzImageModule } from "ng-zorro-antd/image";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzModalModule, NzModalService } from "ng-zorro-antd/modal";
import { NzNotificationModule, NzNotificationService } from "ng-zorro-antd/notification";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzSpaceModule } from "ng-zorro-antd/space";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzTypographyModule } from "ng-zorro-antd/typography";

import { BehaviorSubject, Subscription, debounceTime, distinctUntilChanged, filter, map, noop, switchMap } from "rxjs";
import { defer as deferLD, toUpper, trim } from "lodash";

import { HomeService } from "./home.service";

import { TruncatePipe } from "../shared/truncate.pipe";

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
        TruncatePipe
    ],
    templateUrl: "./home.component.html",
    styleUrls: ["./home.component.less"]
})
export class HomeComponent implements OnInit, OnDestroy {

    listDataset: Array<string> = [];
    generateJSONLStatus = "IDLE";

    imagesBase64: Array<{ id: string, src: string, name: string }> = [];
    files: Array<File> = [];
    imageOCRStatus = "IDLE";

    // Form title
    generateJSONLT1 = "Instruction";
    generateJSONLT2 = "User";
    generateJSONLT3 = "Assistant";

    readonly generateJSONLFormGroup = new FormGroup({
        baseModel: new FormControl("OPENAI", {
            nonNullable: true,
            validators: [
                Validators.required
            ]
        }),
        name: new FormControl("", {
            nonNullable: true,
            validators: [
                Validators.minLength(3),
                Validators.maxLength(64),
                Validators.required
            ]
        }),
        instruction: new FormControl("", {
            nonNullable: true,
            validators: [
                Validators.minLength(1),
                Validators.required
            ]
        }),
        instructionSave: new FormControl(false, {
            nonNullable: true,
            validators: [
                Validators.required
            ]
        }),
        user: new FormControl("", {
            nonNullable: true,
            validators: [
                Validators.minLength(1),
                Validators.required
            ]
        }),
        assistant: new FormControl("", {
            nonNullable: true,
            validators: [
                Validators.minLength(1),
                Validators.required
            ]
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

    readonly #baseModel = this.generateJSONLFormGroup.get("baseModel")!;
    readonly #name = this.generateJSONLFormGroup.get("name")!;
    readonly #assistant = this.generateJSONLFormGroup.get("assistant")!;
    readonly #instruction = this.generateJSONLFormGroup.get("instruction")!;
    readonly #instructionSave = this.generateJSONLFormGroup.get("instructionSave")!;

    readonly #removeNewLines = this.imageOCRFormGroup.get("removeNewLines")!;
    readonly #extractedText = this.imageOCRFormGroup.get("extractedText")!;

    #extractedTextState = "";

    #baseModelSubscription: Subscription | null = null;
    #instructionSubscription: Subscription | null = null;
    #instructionSaveSubscription: Subscription | null = null;

    #removeNewLinesSubscription: Subscription | null = null;

    readonly #renderer2 = inject(Renderer2);
    readonly #route = inject(ActivatedRoute);
    readonly #host = inject(ElementRef<HTMLElement>);
    readonly #nzNotificationService = inject(NzNotificationService);
    readonly #nzModalService = inject(NzModalService);
    readonly #homeService = inject(HomeService);

    readonly #throttleSubject = new BehaviorSubject<"HOLD">("HOLD");

    @ViewChild("fileRef", { read: ElementRef })
    private readonly fileRef!: ElementRef<HTMLInputElement>;
    @ViewChild("emptyRef")
    private readonly emptyRef!: TemplateRef<void>;

    /**
     * @private
    */
    ngOnInit() {
        // 
        this.addCustomValidators();
        // 
        this.listDataset = this.#route.snapshot.data["home"]["datasets"];
        // 
        this.initInstructionState();
        // 
        this.#instructionSaveSubscription = this.#instructionSave.valueChanges.pipe(
            distinctUntilChanged(),
            switchMap(v => {
                if (v) {
                    return this.#homeService.saveInstructionState(this.#instruction.value || "").pipe(
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
        // 
        this.#instructionSubscription = this.#instruction.valueChanges.pipe(
            filter(() => !!this.#instructionSave.value && this.#instruction.valid),
            debounceTime(100),
            switchMap(v => this.#homeService.saveInstructionState(v).pipe(
                map(() => null)
            ))
        )
        .subscribe(noop);
        // 
        this.#baseModelSubscription = this.#baseModel.valueChanges.pipe(
            distinctUntilChanged()
        )
        .subscribe({
            next: v => {
                switch(v) {
                    case "GOOGLE-TEXT-BISON":
                        this.generateJSONLT1 = "Context";
                        this.generateJSONLT2 = "Question";
                        this.generateJSONLT3 = "Output";
                        break;
                    default:
                        this.generateJSONLT1 = "Instruction";
                        this.generateJSONLT2 = "User";
                        this.generateJSONLT3 = "Assistant";
                        break;
                }
            }
        });
        // 
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
        if (this.generateJSONLStatus == "PROCESS" || this.generateJSONLFormGroup.invalid) {
            return;
        }

        this.generateJSONLStatus = "PROCESS";
        this.generateJSONLFormGroup.disable({ emitEvent: false });
        
        this.#homeService.addDataset(this.generateJSONLFormGroup.getRawValue()).subscribe({
            next: v => {
                this.generateJSONLFormGroup.enable({ emitEvent: false });
                this.#assistant.reset();
                this.listDataset = v;
                this.generateJSONLStatus = "DONE";
                this.#nzNotificationService.success("Generate JSONL", "Dataset has been added", {
                    nzCloseIcon: this.emptyRef
                });
                this.#throttleSubject.next("HOLD");
            },
            error: e => {
                this.generateJSONLStatus = "DONE";
                this.generateJSONLFormGroup.enable({ emitEvent: false });
                // 
                const message = e.error.payload as string;
                this.#nzNotificationService.error("Generate JSONL", message, {
                    nzCloseIcon: this.emptyRef,
                    nzDuration: 7500
                });
            }
        });
    }

    downloadDataset(name: string) {
        this.#homeService.downloadDataset(name).subscribe({
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
                this.#nzNotificationService.error("Generate JSONL", message, {
                    nzCloseIcon: this.emptyRef,
                    nzDuration: 7500
                });
            }
        });
    }

    removeDataset(name: string) {
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
                this.#homeService.removeDataset(name).subscribe({
                    next: () => {
                        this.listDataset = this.listDataset.filter(v => v != name);
                        this.#nzNotificationService.blank("Generate JSONL", "Dataset has been removed", {
                            nzCloseIcon: this.emptyRef
                        });
                    }
                });
            }
        });
    }

    setName(name: string) {
        if (this.#name.value == name) {
            return;
        }
        this.#name.patchValue(name);
        if (this.#name.touched) {
            return;
        }
        this.#name.markAllAsTouched();
    }

    onImageSelected(event: Event) {
        if (this.files.length > 15 || this.imageOCRStatus == "SELECTED") {
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
                this.#nzNotificationService.error("Image OCR", `Invalid file type (${file.name})`, {
                    nzCloseIcon: this.emptyRef,
                    nzDuration: 7500
                });
                break;
            }
            if (file.size > MAX_SIZE) {
                this.#nzNotificationService.error("Image OCR", `Invalid file size (${file.name})`, {
                    nzCloseIcon: this.emptyRef,
                    nzDuration: 7500
                });
                break;
            }
            if (idsState.includes(file.name + file.size.toString())) {
                this.#nzNotificationService.info("Image OCR", `File (${file.name}) is ready!`, {
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
        if (this.files.length == 0 || this.imageOCRStatus == "SELECTED" || this.imageOCRStatus == "DONE") {
            return;
        }

        this.imageOCRFormGroup.reset();

        this.imageOCRStatus = "SELECTED";
        this.fileRef.nativeElement.disabled = true;

        const formData = new FormData();

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            formData.append("files", file);
        }

        this.#homeService.scanImage(formData).subscribe({
            next: v => {
                this.fileRef.nativeElement.disabled = false;
                this.imageOCRStatus = "DONE";
                this.#extractedTextState = v;
                this.#extractedText.patchValue(v);
                // 
                this.#nzNotificationService.success("Image OCR", "Image has been extracted", {
                    nzCloseIcon: this.emptyRef
                });
            },
            error: e => {
                this.fileRef.nativeElement.disabled = false;
                this.imageOCRStatus = "DONE";
                this.#extractedTextState = "";
                // 
                const message = e.error.payload as string;
                this.#nzNotificationService.error("Image OCR", message, {
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
        this.imageOCRStatus = "IDLE";
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

    private addCustomValidators() {
        this.#name.addValidators(control => {
            const value = control.value as string;
            const vSplit = value.split(" ").map(v => v.trim());
            if (value && vSplit.some(v => v == "")) {
                return { err: true };
            }
            return null;
        });
        // 
        this.#instruction.addValidators(control => {
            const value = trim(control.value);
            if (toUpper(value) == "EMPTY" || toUpper(value) == "UNAVAILABLE") {
                return { err: true };
            }
            return null;
        });
    }

    private initInstructionState() {
        const instruction = this.#route.snapshot.data["home"]["instruction"] as string;
        switch(instruction) {
            case "EMPTY":
                this.#instructionSave.patchValue(true, { emitEvent: false });
                this.#instructionSave.markAllAsTouched();
                break;
            case "UNAVAILABLE":
                noop();
                break;
            default:
                this.#instruction.patchValue(instruction, { emitEvent: false });
                this.#instruction.markAllAsTouched();
                this.#instructionSave.patchValue(true, { emitEvent: false });
                this.#instructionSave.markAllAsTouched();
                break;
        }
    }
}