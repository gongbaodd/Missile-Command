import type { House } from "./types";

interface SerializedVector3 {
	x: number;
	y: number;
	z: number;
}

interface SerializedColor4 {
	r: number;
	g: number;
	b: number;
	a: number;
}

export interface SerializedHouse {
	position: SerializedVector3;
	size: SerializedVector3;
	color: SerializedColor4;
	isDestroyed: boolean;
}

const HOUSES_KEY = "missile_command_houses_v1";

export function serializeHouses(houses: House[]): SerializedHouse[] {
	return houses.map((h) => ({
		position: { x: h.position.x, y: h.position.y, z: h.position.z },
		size: { x: h.size.x, y: h.size.y, z: h.size.z },
		color: { r: h.color.r, g: h.color.g, b: h.color.b, a: h.color.a },
		isDestroyed: h.isDestroyed,
	}));
}

export function saveHouses(houses: House[]): void {
	try {
		const data = serializeHouses(houses);
		localStorage.setItem(HOUSES_KEY, JSON.stringify(data));
	} catch (_e) {
		// ignore persistence errors
	}
}

export function loadHouses(): SerializedHouse[] | null {
	try {
		const raw = localStorage.getItem(HOUSES_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as SerializedHouse[];
		if (!Array.isArray(parsed)) return null;
		return parsed;
	} catch (_e) {
		return null;
	}
}


