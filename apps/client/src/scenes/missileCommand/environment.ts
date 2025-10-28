import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { type House, type SceneContext } from "./types";
import { loadRoomData, type SerializedHouse } from "./colyseus";

export function createGround(ctx: SceneContext): Mesh {
    const ground = MeshBuilder.CreateCylinder("ground", {
        height: 1,
        diameter: 60,
        tessellation: 32
    }, ctx.scene);

    ground.position.y = 0;

    const groundMaterial = new StandardMaterial("groundMaterial", ctx.scene);
    groundMaterial.diffuseColor = new Color3(0.85, 0.78, 0.98);
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    ground.material = groundMaterial;
    ground.receiveShadows = true;

    return ground;
}

export async function createHouses(ctx: SceneContext): Promise<void> {
    const loaded = await loadRoomData();
    if (loaded && loaded.houses && loaded.houses.length > 0) {
        rebuildHousesFromServerState(ctx, loaded.houses);
        // Ensure we save back to normalize format/version
        // await saveRoomData(ctx.gameState.houses, ctx.gameState.missiles);
        return;
    }
}

function rebuildHousesFromServerState(ctx: SceneContext, serialized: SerializedHouse[]): void {
    const groundRadius = 30;
    for (const sh of serialized) {
        const position = new Vector3(sh.position.x, sh.position.y, sh.position.z);
        // Clamp to ground just in case of data drift
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
        if (distanceFromCenter > groundRadius) {
            const scale = groundRadius / distanceFromCenter;
            position.x *= scale;
            position.z *= scale;
        }
        const size = new Vector3(sh.size.x, sh.size.y, sh.size.z);

        // Recreate house mesh only if not destroyed
        let houseMesh: Mesh | null = null;
        if (!sh.isDestroyed) {
            houseMesh = MeshBuilder.CreateBox("house", {
                width: size.x,
                height: size.y,
                depth: size.z
            }, ctx.scene);
            houseMesh.isPickable = false;
            houseMesh.position = position.clone();
            houseMesh.position.y = + size.y / 2;

            const houseMaterial = new StandardMaterial("houseMaterial", ctx.scene);
            houseMaterial.diffuseColor = new Color3(
                sh.color.r,
                sh.color.g,
                sh.color.b
            );
            houseMaterial.alpha = 0.8;
            houseMesh.material = houseMaterial;
            ctx.shadowGenerator.getShadowMap()!.renderList!.push(houseMesh);
        }

        const house: House = {
            mesh: (houseMesh ?? MeshBuilder.CreateBox("house_destroyed_placeholder", { width: 0.01, height: 0.01, depth: 0.01 }, ctx.scene)),
            position,
            size,
            color: new Color3(sh.color.r, sh.color.g, sh.color.b) as any, // will not be used directly
            isHit: sh.isDestroyed,
            isDestroyed: sh.isDestroyed
        } as unknown as House;

        // If using placeholder for destroyed, dispose it to not render anything
        if (sh.isDestroyed && house.mesh) {
            house.mesh.dispose();
        }

        ctx.gameState.houses.push(house);
    }
}
