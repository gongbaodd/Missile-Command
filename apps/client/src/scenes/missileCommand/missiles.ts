import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { COLORS, type Missile, type SceneContext } from "./types";
import { saveRoomData } from "./colyseus";

export function updateMissiles(ctx: SceneContext, _spawnIntervalMs: number, _spawnTimerRef: { value: number }): void {
	// Auto-spawn removed. Only update existing missiles.
	for (let i = ctx.gameState.missiles.length - 1; i >= 0; i--) {
		const missile = ctx.gameState.missiles[i];
		if (!missile.isActive) {
			ctx.gameState.missiles.splice(i, 1);
			continue;
		}
		updateMissile(ctx, missile);
	}
}

export function dropMissileAt(ctx: SceneContext, x: number, z: number): void {
	const startHeight = 75;
	const missileMesh = MeshBuilder.CreateSphere("missile", { diameter: 2 }, ctx.scene);
	missileMesh.position = new Vector3(x, startHeight, z);

	const missileMaterial = new StandardMaterial("missileMaterial", ctx.scene);
	const colorIndex = Math.floor(Math.random() * COLORS.length);
	missileMaterial.diffuseColor = new Color3(
		COLORS[colorIndex].r,
		COLORS[colorIndex].g,
		COLORS[colorIndex].b
	);
	missileMesh.material = missileMaterial;

    const missile: Missile = {
		mesh: missileMesh,
		position: missileMesh.position.clone(),
		target: new Vector3(x, 0, z),
		speed: 0, // no horizontal movement; pure drop
		verticalVelocity: 0,
		isActive: true,
		isHit: false,
        color: COLORS[colorIndex],
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    };
    ctx.gameState.missiles.push(missile);

    // persist spawn immediately so other clients can reflect state
    saveRoomData(ctx.gameState.houses, ctx.gameState.missiles);
}

function updateMissile(ctx: SceneContext, missile: Missile): void {
    if (missile.isHit) return;

    const deltaTime = ctx.scene.getEngine().getDeltaTime() / 1000;

    // Horizontal steering towards target (ignore vertical axis for direction)
    const toTarget = missile.target.subtract(missile.position);
    const horizontalDir = new Vector3(toTarget.x, 0, toTarget.z);
    if (horizontalDir.length() > 0.0001) {
        horizontalDir.normalize();
    }

    const horizontalSpeed = missile.speed * 100; // world units per second
    const horizontalMove = horizontalDir.scale(horizontalSpeed * deltaTime);

    // Gravity-like acceleration on vertical velocity (downwards)
    const gravity = -2; // units per second^2
    missile.verticalVelocity += gravity * deltaTime;
    const verticalMove = missile.verticalVelocity * deltaTime;

    missile.position.addInPlace(new Vector3(horizontalMove.x, verticalMove, horizontalMove.z));
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

    // persist game state to Firebase
    saveRoomData(ctx.gameState.houses, ctx.gameState.missiles);
}


