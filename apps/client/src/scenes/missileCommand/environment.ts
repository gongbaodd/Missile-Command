import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { COLORS, type House, type SceneContext } from "./types";
import { Vector3 as YukaVector3, AABB as YukaAABB } from "yuka";
import { loadRoomData, saveRoomData, type SerializedHouse } from "./colyseus";

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
        rebuildHousesFromStorage(ctx, loaded.houses);
        // Ensure we save back to normalize format/version
        await saveRoomData(ctx.gameState.houses, ctx.gameState.missiles);
        return;
    }

    const numHouses = 10;
    const groundRadius = 30;

    for (let i = 0; i < numHouses; i++) {
        const house = createSingleHouse(ctx, groundRadius);
        if (house) {
            ctx.gameState.houses.push(house);
        }
    }

    await saveRoomData(ctx.gameState.houses, ctx.gameState.missiles);
}

function rebuildHousesFromStorage(ctx: SceneContext, serialized: SerializedHouse[]): void {
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
    // Keep ground boundary constraint (circular ground with radius 30)
    const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
    if (distanceFromCenter + Math.max(size.x, size.z) / 2 > 30) {
        return false;
    }

    const proposedAABB = getHouseAABB(position, size)

    // Test intersection with existing houses (box vs box)
    for (const house of ctx.gameState.houses) {
        const existingAABB = getHouseAABB(house.position, house.size)
        if (proposedAABB.intersectsAABB(existingAABB)) {
            return false;
        }
    }

    // Avoid placing houses too close to laser systems by approximating lasers with AABBs
    // Laser base ~ radius 3, total height ~ 7.6; add small safety margin
    const laserHalfExtents = new YukaVector3(3, 4, 3);
    for (const laser of ctx.gameState.lasers) {
        const laserCenter = new YukaVector3(laser.position.x, 3.5, laser.position.z);
        const laserMin = laserCenter.clone().sub(laserHalfExtents);
        const laserMax = laserCenter.clone().add(laserHalfExtents);
        const laserAABB = new YukaAABB().set(laserMin, laserMax);

        if (proposedAABB.intersectsAABB(laserAABB)) {
            return false;
        }
    }

    return true;
}

function getHouseAABB(position: Vector3, size: Vector3): YukaAABB {
    const points = []
    // push the 8 corners of the house
    points.push(new YukaVector3(position.x + size.x / 2, position.y + size.y / 2, position.z + size.z / 2));
    points.push(new YukaVector3(position.x + size.x / 2, position.y + size.y / 2, position.z - size.z / 2));
    points.push(new YukaVector3(position.x + size.x / 2, position.y - size.y / 2, position.z + size.z / 2));
    points.push(new YukaVector3(position.x + size.x / 2, position.y - size.y / 2, position.z - size.z / 2));
    points.push(new YukaVector3(position.x - size.x / 2, position.y + size.y / 2, position.z + size.z / 2));
    points.push(new YukaVector3(position.x - size.x / 2, position.y + size.y / 2, position.z - size.z / 2));
    points.push(new YukaVector3(position.x - size.x / 2, position.y - size.y / 2, position.z + size.z / 2));
    points.push(new YukaVector3(position.x - size.x / 2, position.y - size.y / 2, position.z - size.z / 2));

    return new YukaAABB().fromPoints(points);
}
