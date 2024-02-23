import { Routes } from "@angular/router";

import { HomeComponent } from "./home/home.component";

import { datasetResolver } from "./dataset/dataset.resolver";

import { DatasetService } from "./dataset/dataset.service";
import { homeResolver } from "./home/home.resolver";
import { HomeService } from "./home/home.service";

export const routes: Routes = [
    {
        path: "storage/dataset/:model/:name",
        resolve: {
            dataset: datasetResolver
        },
        providers: [
            DatasetService
        ],
        loadComponent: () => import("./dataset/dataset.component")
            .then(c => c.DatasetComponent)
    },
    {
        path: "",
        pathMatch: "full",
        resolve: {
            home: homeResolver
        },
        providers: [
            HomeService
        ],
        component: HomeComponent
    },
    {
        path: "**",
        loadComponent: () => import("./error/error.component")
            .then(c => c.ErrorComponent)
    }
];