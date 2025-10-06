import type { Scene } from "@babylonjs/core/scene";

// Change this import to check other scenes
// import { DefaultSceneWithTexture } from "./scenes/defaultWithTexture";
// import { NavigationMeshRecast } from "./scenes/navigationMeshRecast";
import { MissileCommandScene } from "./scenes/missileCommandScene";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { PlayerRole } from "./scenes/missileCommand/types";

export interface CreateSceneClass {
    createScene: (engine: AbstractEngine, canvas: HTMLCanvasElement) => Promise<Scene>;
    preTasks?: Promise<unknown>[];
}

export interface CreateSceneModule {
    default: CreateSceneClass;
}

export const getSceneModule = (playerRole?: PlayerRole): CreateSceneClass => {
    const scene = new MissileCommandScene();
    if (playerRole) {
        scene.setPlayerRole(playerRole);
    }
    return scene;
    // return new DefaultSceneWithTexture();
}
