import type { Scene } from "@babylonjs/core/scene";

// Change this import to check other scenes
// import { DefaultSceneWithTexture } from "./scenes/defaultWithTexture";
// import { NavigationMeshRecast } from "./scenes/navigationMeshRecast";
import { MissileCommandScene } from "./scenes/missileCommandScene";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";

export interface CreateSceneClass {
    createScene: (engine: AbstractEngine, canvas: HTMLCanvasElement) => Promise<Scene>;
    preTasks?: Promise<unknown>[];
}

export interface CreateSceneModule {
    default: CreateSceneClass;
}

export const getSceneModule = (): CreateSceneClass => {
    return new MissileCommandScene();
    // return new DefaultSceneWithTexture();
}
