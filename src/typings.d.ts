import { FormArray, FormControl, FormGroup } from "@angular/forms";

import { google } from "@google-cloud/documentai/build/protos/protos";

declare global {

    type SafeAny = any;
    interface EnvVar {
        [f: string]: string;
    }

    type BaseModel = "GOOGLE-PALM2-CHAT-BISON" | "GOOGLE-PALM2-TEXT-BISON" | "OPENAI-GPT-3.5";

    // Dataset Structure
    interface GooglePalm2ChatBisonDataset {
        context: string;
        examples?: Array<{
            input: {
                content: string;
            };
            output: {
                content: string;
            };
        }>;
        messages: Array<{
            author: string;
            content: string;
        }>;
    }
    interface GooglePalm2TextBisonDataset {
        input_text: string;
        output_text: string;
    }
    interface OpenaiGpt3Dataset {
        messages: [
            {
                role: "system";
                content: string;
            },
            {
                role: "user";
                content: string;
            },
            {
                role: "assistant";
                content: string;
            }
        ];
    }

    interface ReqJsonlPayload {
        [f: string]: string;
    }
    interface ResJsonlPayload {
        baseModel: BaseModel;
        name: string;
        instruction: string;
        user: string;
        assistant: string;
        inputText: string;
        outputText: string;
    }

    // Document AI
    type IProcessReqRes = [
        google.cloud.documentai.v1.IProcessResponse,
        google.cloud.documentai.v1.IProcessRequest | undefined,
        {} | undefined
    ]

    // Home Component
    interface SelectListDatasetName {
        datasetNames: Array<{
            label: string;
            value: string;
        }>;
        model: BaseModel;
    }
    interface ListDatasetName {
        datasetNames: Array<string>;
        model: BaseModel;
    }
    interface GeneratorGooglePalm2ChatBisonFormControls {
        context: FormControl<string>;
        examples?: FormArray<FormGroup<{
            input: FormGroup<{
                content: FormControl<string>;
            }>;
            output: FormGroup<{
                content: FormControl<string>;
            }>
        }>>;
        messages: FormArray<FormGroup<{
            author: FormControl<string>;
            content: FormControl<string>;
        }>>;
    }
    interface GeneratorGooglePalm2TextBisonFormControls {
        inputText: FormControl<string>;
        outputText: FormControl<string>;
    }
    interface GeneratorOpenaiGpt3FormControls {
        instruction: FormGroup<{
            check: FormControl<boolean>;
            input: FormControl<string>;
        }>;
        user: FormControl<string>;
        assistant: FormControl<string>;
    }
    interface GeneratorJsonlFormGroup {
        baseModel: FormControl<BaseModel>;
        name: FormGroup<{
            select: FormControl<string | null>;
            input: FormControl<string>;
        }>;
        googlePalm2ChatBison?: FormGroup<GeneratorGooglePalm2ChatBisonFormControls>;
        googlePalm2TextBison?: FormGroup<GeneratorGooglePalm2TextBisonFormControls>;
        openaiGpt3?: FormGroup<GeneratorOpenaiGpt3FormControls>;
    }
    interface ResolveHome {
        collection: Array<{
            datasetNames: Array<string>;
            model: string;
        }>;
        instruction: string;
    }

    // Dataset Component
    interface EditorJsonlMetadataRawValue {
        metadata: {
            edit: boolean;
        };
    }
    interface EditorJsonlMetadata {
        metadata: FormGroup<{
            edit: FormControl<boolean>;
        }>;
    }
    interface EditorGooglePalm2ChatBisonFormControls extends EditorJsonlMetadata {
        context: FormControl<string>;
        examples?: FormArray<FormGroup<{
            input: FormGroup<{
                content: FormControl<string>;
            }>;
            output: FormGroup<{
                content: FormControl<string>;
            }>;
        }>>;
        messages: FormArray<FormGroup<{
            author: FormControl<string>;
            content: FormControl<string>;
        }>>;
    }
    interface EditorGooglePalm2TextBisonRawValue extends EditorJsonlMetadataRawValue {
        inputText: string;
        outputText: string;
    }
    interface EditorGooglePalm2TextBisonFormControls extends EditorJsonlMetadata {
        inputText: FormControl<string>;
        outputText: FormControl<string>;
    }
    interface EditorOpenaiGpt3RawValue extends EditorJsonlMetadataRawValue {
        messages: {
            instruction: string;
            user: string;
            assistant: string;
        };
    }
    interface EditorOpenaiGpt3FormControls extends EditorJsonlMetadata {
        messages: FormGroup<{
            instruction: FormControl<string>;
            user: FormControl<string>;
            assistant: FormControl<string>;
        }>;
    }
    interface EditorJsonlFormGroup {
        googlePalm2ChatBison?: FormArray<FormGroup<EditorGooglePalm2ChatBisonFormControls>>;
        googlePalm2TextBison?: FormArray<FormGroup<EditorGooglePalm2TextBisonFormControls>>;
        openaiGpt3?: FormArray<FormGroup<EditorOpenaiGpt3FormControls>>;
    }
    interface ResolveDataset {
        name: string;
        model: BaseModel | null;
        dataset: Array<GooglePalm2ChatBisonDataset> | Array<GooglePalm2TextBisonDataset> | Array<OpenaiGpt3Dataset>;
    }
}