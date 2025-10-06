import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";

export const COLORS: Color4[] = [
	new Color4(1, 0.34, 0.2, 0.5),
	new Color4(0.2, 1, 0.34, 0.5),
	new Color4(0.34, 0.2, 1, 0.5),
	new Color4(1, 0.84, 0, 0.5),
	new Color4(1, 0.41, 0.71, 0.5),
	new Color4(0, 0.81, 0.82, 0.5),
	new Color4(1, 0.65, 0, 0.5),
	new Color4(0.54, 0.17, 0.89, 0.5),
	new Color4(0.13, 0.55, 0.13, 0.5),
	new Color4(1, 0.27, 0, 0.5)
];

export interface House {
	mesh: Mesh;
	position: Vector3;
	size: Vector3;
	color: Color4;
	isHit: boolean;
	isDestroyed: boolean;
}

export interface Missile {
	mesh: Mesh;
	position: Vector3;
	target: Vector3;
	speed: number;
	isActive: boolean;
	isHit: boolean;
	color: Color4;
}

export interface Marker {
	position: Vector3;
	time: number;
	isDone: boolean;
	assignedLaser?: LaserSystem;
	mesh: Mesh;
}

export interface LaserSystem {
	mesh: Mesh;
	position: Vector3;
	isBusy: boolean;
	target?: Vector3;
	shootTime: number;
	color: Color4;
	beamMesh?: LinesMesh;
	beamCurrentLength?: number;
	beamTotalLength?: number;
	beamDirection?: Vector3;
	currentMarker?: Marker;
}

export interface GameState {
	houses: House[];
	missiles: Missile[];
	lasers: LaserSystem[];
	markers: Marker[];
	isGameOver: boolean;
	score: number;
}

export interface SceneContext {
	scene: Scene;
	shadowGenerator: ShadowGenerator;
	gameState: GameState;
}


