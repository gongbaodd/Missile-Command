import { Mesh, Vector3, Color4 } from "@babylonjs/core";

export interface House {
	mesh: Mesh;
	position: Vector3;
	size: Vector3;
	color: Color4;
	isHit: boolean;
	isDestroyed: boolean;
}

export enum PlayerRole {
	ATTACKER = 'attacker',
	DEFENDER = 'defender'
}