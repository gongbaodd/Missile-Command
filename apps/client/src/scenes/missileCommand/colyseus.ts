import type { House, Missile } from "./types";
import { PlayerRole } from "./types";
import { Client, Room } from "colyseus.js";

// Colyseus client singleton
let client: Client | null = null;
let roomPromise: Promise<Room> | null = null;

function getClient(): Client {
    if (!client) {
        client = new Client("ws://localhost:2567");
    }
    return client;
}

function getRoomName(): string {
    // Server is expected to have a room handler with this name
    return "missile_command";
}

export function getRoomHash(): string {
    const hash = window.location.hash.slice(1);
    if (hash === "") {
        alert("Room hash is empty");
        throw new Error("Room hash is empty");
    }
    return hash;
}

async function getRoom(): Promise<Room> {
    if (!roomPromise) {
        const client = getClient();
        const roomName = getRoomName();
        const hash = getRoomHash();
        // Provide hash so server can group state per room
        roomPromise = client.joinOrCreate(roomName, { hash }).catch(async (e) => {
            // Fallback to create, then join
            try {
                return await client.create(roomName, { hash });
            } catch (_e) {
                // As a last resort, try join
                return await client.join(roomName, { hash });
            }
        });
    }
    return roomPromise;
}

// Serialized interfaces for storage/messaging parity with previous Firebase module
export interface SerializedVector3 {
    x: number;
    y: number;
    z: number;
}

export interface SerializedColor4 {
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

export function serializeHouses(houses: House[]): SerializedHouse[] {
    return houses.map((h) => ({
        position: { x: h.position.x, y: h.position.y, z: h.position.z },
        size: { x: h.size.x, y: h.size.y, z: h.size.z },
        color: { r: h.color.r, g: h.color.g, b: h.color.b, a: h.color.a },
        isDestroyed: h.isDestroyed,
    }));
}

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

export async function saveRoomData(houses: House[], missiles: Missile[]): Promise<void> {
    try {
        const room = await getRoom();
        const data: SerializedRoomData = {
            houses: serializeHouses(houses),
            missiles: serializeMissiles(missiles),
            timestamp: Date.now(),
        };
        room.send("saveRoomData", data);
    } catch (error) {
        console.error("Failed to save room data via Colyseus:", error);
    }
}

export async function loadRoomData(): Promise<SerializedRoomData | null> {
    try {
        const room = await getRoom();
        return await new Promise<SerializedRoomData | null>((resolve) => {
            const handler = (payload: SerializedRoomData) => {
                room.offMessage("roomData", handler);
                resolve(payload ?? null);
            };
            room.onMessage("roomData", handler);
            room.send("loadRoomData");
            // soft timeout safeguard
            setTimeout(() => {
                room.offMessage("roomData", handler);
                resolve(null);
            }, 2000);
        });
    } catch (error) {
        console.error("Failed to load room data via Colyseus:", error);
        return null;
    }
}

export async function checkRoomExists(_roomHash?: string): Promise<boolean> {
    try {
        await getRoom();
        return true;
    } catch (error) {
        console.error("Colyseus room check failed:", error);
        return false;
    }
}

export function listenToRoomData(callback: (data: SerializedRoomData | null) => void): () => void {
    let disposed = false;
    getRoom().then((room) => {
        if (disposed) return;
        const handler = (payload: SerializedRoomData) => callback(payload ?? null);
        room.onMessage("roomData", handler);
        // Ask server to start streaming updates
        room.send("subscribeRoomData");
    }).catch((_e) => { /* ignore */ });
    return () => {
        disposed = true;
        // We intentionally keep the room open; consumers can close page to disconnect
    };
}

export async function emitMissileSpawn(x: number, z: number): Promise<void> {
    try {
        const room = await getRoom();
        room.send("missileSpawn", { x, z, t: Date.now() });
    } catch (error) {
        console.error("Failed to emit missile spawn via Colyseus:", error);
    }
}

export function listenForMissileSpawns(callback: (x: number, z: number, eventKey: string) => void): () => void {
    let disposed = false;
    getRoom().then((room) => {
        if (disposed) return;
        const handler = (payload: { x: number; z: number; t?: number; id?: string }) => {
            const key = payload.id || `${payload.x},${payload.z},${payload.t ?? Date.now()}`;
            callback(payload.x, payload.z, key);
        };
        room.onMessage("missileSpawn", handler);
        room.send("subscribeMissileSpawns");
    }).catch((_e) => { /* ignore */ });
    return () => {
        disposed = true;
    };
}

export async function registerPlayer(role: PlayerRole): Promise<void> {
    try {
        const room = await getRoom();
        // Generate a stable, installation-like id per browser using localStorage
        let fid = localStorage.getItem("mc_fid");
        if (!fid) {
            fid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem("mc_fid", fid);
        }
        room.send("registerPlayer", { role, fid, lastSeen: Date.now() });
    } catch (error) {
        console.error("Failed to register player via Colyseus:", error);
    }
}

export async function getCurrentPlayerInfo(): Promise<PlayerInfo | null> {
    try {
        const room = await getRoom();
        let fid = localStorage.getItem("mc_fid");
        if (!fid) return null;
        room.send("getCurrentPlayerInfo", { fid });
        return await new Promise<PlayerInfo | null>((resolve) => {
            const handler = (payload: PlayerInfo | null) => {
                room.offMessage("currentPlayerInfo", handler as any);
                resolve(payload);
            };
            room.onMessage("currentPlayerInfo", handler as any);
            setTimeout(() => {
                room.offMessage("currentPlayerInfo", handler as any);
                resolve(null);
            }, 1500);
        });
    } catch (error) {
        console.error("Failed to get current player info via Colyseus:", error);
        return null;
    }
}

export async function getAllPlayersInRoom(_roomHash?: string): Promise<PlayerInfo[]> {
    try {
        const room = await getRoom();
        room.send("getAllPlayers");
        return await new Promise<PlayerInfo[]>((resolve) => {
            const handler = (payload: PlayerInfo[]) => {
                room.offMessage("allPlayers", handler as any);
                resolve(payload || []);
            };
            room.onMessage("allPlayers", handler as any);
            setTimeout(() => {
                room.offMessage("allPlayers", handler as any);
                resolve([]);
            }, 1500);
        });
    } catch (error) {
        console.error("Failed to get all players via Colyseus:", error);
        return [];
    }
}


