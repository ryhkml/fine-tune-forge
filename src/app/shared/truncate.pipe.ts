import { Pipe, PipeTransform } from "@angular/core";

import { truncate } from "lodash";

@Pipe({
    name: "truncate",
    standalone: true
})
export class TruncatePipe implements PipeTransform {

    transform(value: string, limit = 12): string {
        return truncate(value, {
            length: limit,
            separator: " "
        });
    }
}