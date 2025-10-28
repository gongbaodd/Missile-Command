import type { Scene } from "@babylonjs/core/scene";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";

export interface CreateSceneClass {
    createScene: (engine: NullEngine) => Scene;
    preTasks?: Promise<unknown>[];
}

export interface CreateSceneModule {
    default: CreateSceneClass;
}

// export const getSceneModule = (playerRole?: PlayerRole): CreateSceneClass => {
//     const scene = new MissileCommandScene();
//     if (playerRole) {
//         scene.setPlayerRole(playerRole);
//     }
//     return scene;
// }
