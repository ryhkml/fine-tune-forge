import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: "modelName",
    standalone: true
})
export class OptionLabelPipe implements PipeTransform {

    transform(value: string): string {
        switch(value) {
            case "GOOGLE-PALM2-CHAT-BISON":
                return "PaLM 2 for Chat (Chat-Bison)";
            case "GOOGLE-PALM2-TEXT-BISON":
                return "PaLM 2 for Text (Text-Bison)";
            default:
                return "GPT-3.5";
        }
    }
}