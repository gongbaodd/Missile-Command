import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue } from "firebase/database";
import type { House, Missile } from "./types";

const firebaseConfig = {
    apiKey: "AIzaSyBmhyS8vRGw35zxDZOaHkjENFODLi_dhy8",
    authDomain: "missile-command-8a4e7.firebaseapp.com",
    databaseURL:
      "https://missile-command-8a4e7-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "missile-command-8a4e7",
    storageBucket: "missile-command-8a4e7.firebasestorage.app",
    messagingSenderId: "660239741911",
    appId: "1:660239741911:web:8cd8e7670aa1d649905192",
    measurementId: "G-35X7F01Z30",
  };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Serialized interfaces for Firebase storage
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

export interface SerializedMissile {
	position: SerializedVector3;
	target: SerializedVector3;
	speed: number;
	verticalVelocity: number;
	isActive: boolean;
	isHit: boolean;
	color: SerializedColor4;
}

export interface SerializedRoomData {
	houses: SerializedHouse[];
	missiles: SerializedMissile[];
	timestamp: number;
}

// Get room reference using location.hash as key
function getRoomRef(roomHash: string) {
	return ref(db, `rooms/${roomHash}`);
}

// Serialize houses for Firebase storage
export function serializeHouses(houses: House[]): SerializedHouse[] {
	return houses.map((h) => ({
		position: { x: h.position.x, y: h.position.y, z: h.position.z },
		size: { x: h.size.x, y: h.size.y, z: h.size.z },
		color: { r: h.color.r, g: h.color.g, b: h.color.b, a: h.color.a },
		isDestroyed: h.isDestroyed,
	}));
}

// Serialize missiles for Firebase storage
export function serializeMissiles(missiles: Missile[]): SerializedMissile[] {
	return missiles.map((m) => ({
		position: { x: m.position.x, y: m.position.y, z: m.position.z },
		target: { x: m.target.x, y: m.target.y, z: m.target.z },
		speed: m.speed,
		verticalVelocity: m.verticalVelocity,
		isActive: m.isActive,
		isHit: m.isHit,
		color: { r: m.color.r, g: m.color.g, b: m.color.b, a: m.color.a },
	}));
}

// Save room data to Firebase
export async function saveRoomData(houses: House[], missiles: Missile[]): Promise<void> {
	try {
		const roomHash = getRoomHash();
		const roomRef = getRoomRef(roomHash);
		
		const data: SerializedRoomData = {
			houses: serializeHouses(houses),
			missiles: serializeMissiles(missiles),
			timestamp: Date.now()
		};
		
		await set(roomRef, data);
	} catch (error) {
		console.error('Failed to save room data:', error);
	}
}

// Load room data from Firebase
export async function loadRoomData(): Promise<SerializedRoomData | null> {
	try {
		const roomHash = getRoomHash();
		const roomRef = getRoomRef(roomHash);
		
		const snapshot = await get(roomRef);
		if (snapshot.exists()) {
			return snapshot.val() as SerializedRoomData;
		}
		return null;
	} catch (error) {
		console.error('Failed to load room data:', error);
		return null;
	}
}

// Get room hash from URL
export function getRoomHash(): string {
	const hash = window.location.hash.slice(1);
	if (hash === '') {
        alert('Room hash is empty');
        throw new Error('Room hash is empty');
	}
	return hash;
}

// Check if room exists in Firebase and log error if not found
export async function checkRoomExists(roomHash?: string): Promise<boolean> {
	const hash = roomHash || getRoomHash();
	const roomRef = getRoomRef(hash);
	
	try {
		const snapshot = await get(roomRef);
		if (!snapshot.exists()) {
			console.error(`Room '${hash}' does not exist in Firebase`);
			return false;
		}
		return true;
	} catch (error) {
		console.error(`Error checking room '${hash}':`, error);
		return false;
	}
}

// Listen to room data changes in real-time
export function listenToRoomData(callback: (data: SerializedRoomData | null) => void): () => void {
	const roomHash = getRoomHash();
	const roomRef = getRoomRef(roomHash);
	
	const unsubscribe = onValue(roomRef, (snapshot) => {
		if (snapshot.exists()) {
			callback(snapshot.val() as SerializedRoomData);
		} else {
			callback(null);
		}
	});
	
	return unsubscribe;
}
