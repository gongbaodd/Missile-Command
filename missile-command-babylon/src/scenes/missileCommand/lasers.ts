import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { type LaserSystem, type Marker, type SceneContext } from "./types";

export function createLaserSystems(ctx: SceneContext): void {
    const laserPositions = [
        new Vector3(25, 0, 5),
        new Vector3(-15, 0, 20),
        new Vector3(-5, 0, -25)
    ];

    for (let i = 0; i < laserPositions.length; i++) {
        const position = laserPositions[i];
        const laserMesh = createLaserMesh(ctx, position);

        ctx.gameState.lasers.push({
            mesh: laserMesh,
            position,
            isBusy: false,
            shootTime: 0,
            color: new Color3(0, 1, 0,).toColor4(1)
        });
    }
}

export function createLaserMesh(ctx: SceneContext, position: Vector3): Mesh {
    const base = MeshBuilder.CreateCylinder("laserBase", {
        height: 5.6,
        diameterTop: 0,
        diameterBottom: 6,
    }, ctx.scene);

    base.position = position.clone();
    base.position.y += 2.8;

    const head = MeshBuilder.CreateCylinder("laserHead", {
        height: 2,
        diameterTop: 8,
        diameterBottom: 0
    }, ctx.scene);

    head.position = position.clone();
    head.position.y += 3.5;

    const laserMesh = Mesh.MergeMeshes([base, head], true, true, undefined, false, true)!;

    const laserMaterial = new StandardMaterial("laserMaterial", ctx.scene);
    laserMaterial.diffuseColor = new Color3(0.3, 0.8, 0.3);
    laserMaterial.emissiveColor = new Color3(0.1, 0.3, 0.1);
    laserMesh.material = laserMaterial;

    laserMesh.receiveShadows = true;
    ctx.shadowGenerator.getShadowMap()!.renderList!.push(laserMesh);

    return laserMesh;
}

export function createPlusMarker(ctx: SceneContext, position: Vector3): Mesh {
    const thickness = 0.3;
    const length = 6;

    const barX = MeshBuilder.CreateBox("markerBarX", {
        width: length,
        height: thickness,
        depth: thickness
    }, ctx.scene);

    const barZ = MeshBuilder.CreateBox("markerBarZ", {
        width: thickness,
        height: thickness,
        depth: length
    }, ctx.scene);

    const plusMesh = Mesh.MergeMeshes([barX, barZ], true, true, undefined, false, true)!;

    const markerMaterial = new StandardMaterial("markerMaterial", ctx.scene);
    markerMaterial.diffuseColor = new Color3(0, 0.2, 0);
    markerMaterial.emissiveColor = new Color3(0, 1, 0);
    plusMesh.material = markerMaterial;
    plusMesh.isPickable = false;

    plusMesh.billboardMode = AbstractMesh.BILLBOARDMODE_ALL;

    plusMesh.position = new Vector3(position.x, Math.max(0.5, position.y), position.z);
    plusMesh.rotation.x = Math.PI / 2;

    return plusMesh;
}

export function findNearestAvailableLaser(ctx: SceneContext, position: Vector3): LaserSystem | null {
    let nearestLaser: LaserSystem | null = null;
    let minDistance = Infinity;

    for (const laser of ctx.gameState.lasers) {
        if (laser.isBusy) continue;

        const distance = Vector3.Distance(laser.position, position);
        if (distance < minDistance) {
            minDistance = distance;
            nearestLaser = laser;
        }
    }

    return nearestLaser;
}

export function updateLasers(ctx: SceneContext): void {
    const deltaTimeSeconds = ctx.scene.getEngine().getDeltaTime() / 1000;
    const beamSpeedUnitsPerSecond = 20;

    for (const laser of ctx.gameState.lasers) {
        if (!laser.isBusy || !laser.target || !laser.beamMesh || !laser.beamDirection || laser.beamTotalLength === undefined) {
            continue;
        }

        const currentLength = (laser.beamCurrentLength ?? 0) + beamSpeedUnitsPerSecond * deltaTimeSeconds;
        const clampedLength = Math.min(currentLength, laser.beamTotalLength);
        laser.beamCurrentLength = clampedLength;

        const start = new Vector3(laser.position.x, 3.5, laser.position.z);
        const end = start.add(laser.beamDirection.scale(clampedLength));

        MeshBuilder.CreateLines("laserBeam", {
            points: [start, end],
            instance: laser.beamMesh
        }, ctx.scene);

        if (clampedLength >= (laser.beamTotalLength ?? 0)) {
            let marker = laser.currentMarker;
            if (!marker) {
                marker = ctx.gameState.markers.find(m => !m.isDone && m.assignedLaser === laser);
            }
            if (marker) {
                resolveMarkerHit(ctx, marker);
            }

            if (laser.beamMesh) {
                laser.beamMesh.dispose();
            }
            laser.beamMesh = undefined;
            laser.beamCurrentLength = 0;
            laser.beamTotalLength = 0;
            laser.beamDirection = undefined;
            laser.isBusy = false;
            laser.target = undefined;
            laser.currentMarker = undefined;
            laser.shootTime = 0;
        }
    }
}

function resolveMarkerHit(ctx: SceneContext, marker: Marker): void {
    const explosionRadius = 5;
    const explosion = MeshBuilder.CreateSphere("explosion", { diameter: explosionRadius * 2, segments: 16 }, ctx.scene);
    const explosionCenter = marker.mesh.getAbsolutePosition().clone();
    explosion.position.copyFrom(explosionCenter);
    const explosionMaterial = new StandardMaterial("explosionMaterial", ctx.scene);
    explosionMaterial.diffuseColor = new Color3(1, 1, 0);
    explosionMaterial.emissiveColor = new Color3(1, 1, 0);
    explosionMaterial.alpha = 0.6;
    explosion.material = explosionMaterial;
    explosion.isPickable = false;

    for (let i = ctx.gameState.missiles.length - 1; i >= 0; i--) {
        const missile = ctx.gameState.missiles[i];
        if (!missile.isActive) continue;
        const distance = Vector3.Distance(missile.position, explosionCenter);
        if (distance <= explosionRadius) {
            missile.isActive = false;
            missile.mesh.dispose();
            ctx.gameState.score += 10;
        }
    }

    setTimeout(() => {
        explosion.dispose();
    }, 800);

    marker.isDone = true;
}


