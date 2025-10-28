import { initializeApp } from "firebase/app";
import { getInstallations, getId as getInstallationId } from "firebase/installations";
import { getDatabase, ref, set, get, onValue, update, push } from "firebase/database";
import type { House, Missile } from "./types";
import { PlayerRole } from "./types";

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
    id?: string;
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

export interface PlayerInfo {
    fid: string;
    role: PlayerRole;
    lastSeen: number;
}

// Get room reference using location.hash as key
function getRoomRef(roomHash: string) {
	return ref(db, `rooms/${roomHash}`);
}

function getPlayerRef(roomHash: string, fid: string) {
    return ref(db, `rooms/${roomHash}/players/${fid}`);
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
        id: m.id,
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
		
        // Only update specific fields so we don't overwrite siblings like 'players'
        await update(roomRef, data as any);
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

// Emit a missile spawn event at rooms/{roomHash}/events/missiles with unique id
export async function emitMissileSpawn(x: number, z: number): Promise<void> {
    try {
        const roomHash = getRoomHash();
        const eventsRef = ref(db, `rooms/${roomHash}/events/missiles`);
        await push(eventsRef, {
            x,
            z,
            t: Date.now()
        });
    } catch (error) {
        console.error("Failed to emit missile spawn:", error);
    }
}

// Listen for missile spawn events; caller handles spawning in scene
export function listenForMissileSpawns(callback: (x: number, z: number, eventKey: string) => void): () => void {
    const roomHash = getRoomHash();
    const eventsRef = ref(db, `rooms/${roomHash}/events/missiles`);
    const unsubscribe = onValue(eventsRef, (snapshot) => {
        if (!snapshot.exists()) return;
        const value = snapshot.val() as Record<string, { x: number; z: number; t: number }>;
        for (const [key, evt] of Object.entries(value)) {
            callback(evt.x, evt.z, key);
        }
    });
    return unsubscribe;
}

// Register the current client as a player in the room with role and fid
export async function registerPlayer(role: PlayerRole): Promise<void> {
    try {
        const roomHash = getRoomHash();
        const installations = getInstallations(app);
        const fid = await getInstallationId(installations);
        const playerRef = getPlayerRef(roomHash, fid);
        await set(playerRef, {
            role,
            fid,
            lastSeen: Date.now()
        });
    } catch (error) {
        console.error("Failed to register player:", error);
    }
}

// Fetch the current client's player record from Firebase
export async function getCurrentPlayerInfo(): Promise<PlayerInfo | null> {
    try {
        const roomHash = getRoomHash();
        const installations = getInstallations(app);
        const fid = await getInstallationId(installations);
        const playerRef = getPlayerRef(roomHash, fid);
        const snapshot = await get(playerRef);
        if (!snapshot.exists()) return null;
        const value = snapshot.val() as Omit<PlayerInfo, "fid">;
        return { fid, ...value };
    } catch (error) {
        console.error("Failed to get current player info:", error);
        return null;
    }
}

// Get all players in a room
export async function getAllPlayersInRoom(roomHash?: string): Promise<PlayerInfo[]> {
    try {
        const hash = roomHash || getRoomHash();
        const playersRef = ref(db, `rooms/${hash}/players`);
        const snapshot = await get(playersRef);
        if (!snapshot.exists()) return [];
        
        const playersData = snapshot.val();
        return Object.entries(playersData).map(([fid, playerData]: [string, any]) => ({
            fid,
            role: playerData.role,
            lastSeen: playerData.lastSeen
        }));
    } catch (error) {
        console.error("Failed to get all players in room:", error);
        return [];
    }
}