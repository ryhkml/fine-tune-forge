import { Routes } from "@angular/router";

import { HomeComponent } from "./home/home.component";

export const routes: Routes = [
    {
        path: "",
        pathMatch: "full",
        component: HomeComponent
    },
    {
        path: "**",
        loadComponent: () => import("./error/error.component").then(c => c.ErrorComponent)
    }
];