import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { COLORS, type Missile, type SceneContext } from "./types";
import { saveHouses } from "./storage";

export function updateMissiles(ctx: SceneContext, spawnIntervalMs: number, spawnTimerRef: { value: number }): void {
    spawnTimerRef.value += ctx.scene.getEngine().getDeltaTime();
    if (spawnTimerRef.value >= spawnIntervalMs) {
        spawnMissile(ctx);
        spawnTimerRef.value = 0;
    }

    for (let i = ctx.gameState.missiles.length - 1; i >= 0; i--) {
        const missile = ctx.gameState.missiles[i];
        if (!missile.isActive) {
            ctx.gameState.missiles.splice(i, 1);
            continue;
        }
        updateMissile(ctx, missile);
    }
}

function spawnMissile(ctx: SceneContext): void {
    const groundRadius = 30;
    const startHeight = 50;

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * groundRadius;
    const startX = Math.cos(angle) * distance;
    const startZ = Math.sin(angle) * distance;

    const targetX = Math.random() * groundRadius * 2 - groundRadius;
    const targetZ = Math.random() * groundRadius * 2 - groundRadius;

    const missileMesh = MeshBuilder.CreateSphere("missile", { diameter: 2 }, ctx.scene);
    missileMesh.position = new Vector3(startX, startHeight, startZ);

    const missileMaterial = new StandardMaterial("missileMaterial", ctx.scene);
    const colorIndex = Math.floor(Math.random() * COLORS.length);
    missileMaterial.diffuseColor = new Color3(
        COLORS[colorIndex].r,
        COLORS[colorIndex].g,
        COLORS[colorIndex].b
    );
    missileMesh.material = missileMaterial;

    ctx.gameState.missiles.push({
        mesh: missileMesh,
        position: missileMesh.position.clone(),
        target: new Vector3(targetX, 0, targetZ),
        speed: 0.02,
        isActive: true,
        isHit: false,
        color: COLORS[colorIndex]
    });
}

function updateMissile(ctx: SceneContext, missile: Missile): void {
    if (missile.isHit) return;

    const direction = missile.target.subtract(missile.position).normalize();
    const deltaTime = ctx.scene.getEngine().getDeltaTime() / 1000;
    const movement = direction.scale(missile.speed * deltaTime * 100);

    missile.position.addInPlace(movement);
    missile.mesh.position = missile.position;

    if (missile.position.y <= 0) {
        explodeMissile(ctx, missile);
    }

    checkMissileHouseCollision(ctx, missile);
}

function explodeMissile(ctx: SceneContext, missile: Missile): void {
    missile.isActive = false;
    missile.mesh.dispose();
    checkMissileHouseCollision(ctx, missile);
}

function checkMissileHouseCollision(ctx: SceneContext, missile: Missile): void {
    for (const house of ctx.gameState.houses) {
        if (house.isDestroyed) continue;

        const distance = Vector3.Distance(missile.position, house.position);
        if (distance < 3) {
            hitHouse(ctx, house);
            explodeMissile(ctx, missile);
            break;
        }
    }
}

function hitHouse(ctx: SceneContext, house: any): void {
    house.isHit = true;
    house.isDestroyed = true;

    const hitMaterial = new StandardMaterial("hitMaterial", ctx.scene);
    hitMaterial.diffuseColor = new Color3(1, 0, 0);
    house.mesh.material = hitMaterial;

    setTimeout(() => {
        house.mesh.dispose();
    }, 1000);

    // persist houses to storage
    saveHouses(ctx.gameState.houses);
}


