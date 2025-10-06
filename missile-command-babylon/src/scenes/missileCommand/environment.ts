import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { COLORS, type House, type SceneContext } from "./types";

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

export function createHouses(ctx: SceneContext): void {
    const numHouses = 10;
    const groundRadius = 30;

    for (let i = 0; i < numHouses; i++) {
        const house = createSingleHouse(ctx, groundRadius);
        if (house) {
            ctx.gameState.houses.push(house);
        }
    }
}

function createSingleHouse(ctx: SceneContext, groundRadius: number): House | null {
    const maxAttempts = 100;
    let attempts = 0;

    while (attempts < maxAttempts) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (groundRadius - 5);
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = 0;

        const position = new Vector3(x, y, z);
        const size = new Vector3(
            Math.random() * 8 + 4,
            Math.random() * 15 + 10,
            Math.random() * 8 + 4
        );

        if (isValidHousePosition(ctx, position, size)) {
            const houseMesh = MeshBuilder.CreateBox("house", {
                width: size.x,
                height: size.y,
                depth: size.z
            }, ctx.scene);

            houseMesh.isPickable = false;
            houseMesh.position = position;
            houseMesh.position.y = + size.y / 2;

            const colorIndex = Math.floor(Math.random() * COLORS.length);
            const houseMaterial = new StandardMaterial("houseMaterial", ctx.scene);
            houseMaterial.diffuseColor = new Color3(
                COLORS[colorIndex].r,
                COLORS[colorIndex].g,
                COLORS[colorIndex].b
            );
            houseMaterial.alpha = 0.8;
            houseMesh.material = houseMaterial;
            ctx.shadowGenerator.getShadowMap()!.renderList!.push(houseMesh);

            return {
                mesh: houseMesh,
                position,
                size,
                color: COLORS[colorIndex],
                isHit: false,
                isDestroyed: false
            };
        }

        attempts++;
    }

    return null;
}

function isValidHousePosition(ctx: SceneContext, position: Vector3, size: Vector3): boolean {
    const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
    if (distanceFromCenter + Math.max(size.x, size.z) / 2 > 30) {
        return false;
    }

    for (const house of ctx.gameState.houses) {
        const dx = Math.abs(position.x - house.position.x);
        const dz = Math.abs(position.z - house.position.z);

        if (dx < (size.x + house.size.x) / 2 && dz < (size.z + house.size.z) / 2) {
            return false;
        }
    }

    return true;
}


