import type { House, Missile } from "./types";
import { PlayerRole } from "./types";
import { Client, Room } from "colyseus.js";

// Colyseus client singleton
let client: Client | null = null;
let roomPromise: Promise<Room> | null = null;
// removed state callbacks singleton as it's not used by the client code

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

async function getRoom(): Promise<Room> {
    if (!roomPromise) {
        const client = getClient();
        const roomName = getRoomName();
        const connect = (opts?: Record<string, unknown>) =>
            client.joinOrCreate(roomName, opts).catch(async (_e) => {
                try {
                    return await client.create(roomName, opts);
                } catch (__e) {
                    return await client.join(roomName, opts);
                }
            });
        // Always connect to the single room; no hash-based segregation
        roomPromise = connect();
    }
    const room = await roomPromise;
    return room;
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
    a?: number;
}

export interface SerializedHouse {
    position: SerializedVector3;
    size: SerializedVector3;
    color: SerializedColor4;
    isDestroyed: boolean;
    isHit?: boolean;
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

export interface SerializedLaser {
    position: SerializedVector3;
    isBusy: boolean;
    shootTime: number;
}

export interface SerializedRoomData {
    houses: SerializedHouse[];
    missiles: SerializedMissile[];
    lasers: SerializedLaser[];
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
            lasers: [],
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
        // Helper to take a snapshot from current room.state (works with onCreated server init)
        const snapshotFromState = (): SerializedRoomData | null => {
            const state: any = (room as any).state;
            if (!state) return null;
            const mapLikeToArray = (m: any): any[] => {
                if (!m) return [];
                if (Array.isArray(m)) return m;
                if (typeof m.forEach === "function" && !Array.isArray(m)) {
                    const arr: any[] = [];
                    m.forEach((v: any) => arr.push(v));
                    return arr;
                }
                return Object.values(m);
            };

            const housesRaw = mapLikeToArray(state.houses);
            const missilesRaw = mapLikeToArray(state.missiles);
            const lasersRaw = mapLikeToArray(state.lasers);
            if (!housesRaw.length && !missilesRaw.length && !lasersRaw.length) return null;

            const houses: SerializedHouse[] = housesRaw.map((h: any) => ({
                position: { x: h.position?.x ?? 0, y: h.position?.y ?? 0, z: h.position?.z ?? 0 },
                size: { x: h.size?.x ?? 4, y: h.size?.y ?? 10, z: h.size?.z ?? 4 },
                color: { r: h.color?.r ?? 1, g: h.color?.g ?? 1, b: h.color?.b ?? 1, a: h.color?.a },
                isDestroyed: !!h.isDestroyed,
                isHit: !!h.isHit,
            }));
            const missiles: SerializedMissile[] = missilesRaw.map((m: any) => ({
                id: m.id,
                position: { x: m.position?.x ?? 0, y: m.position?.y ?? 0, z: m.position?.z ?? 0 },
                target: { x: m.target?.x ?? 0, y: m.target?.y ?? 0, z: m.target?.z ?? 0 },
                speed: typeof m.speed === "number" ? m.speed : 1,
                verticalVelocity: typeof m.verticalVelocity === "number" ? m.verticalVelocity : 0,
                isActive: !!m.isActive,
                isHit: !!m.isHit,
                color: { r: m.color?.r ?? 1, g: m.color?.g ?? 1, b: m.color?.b ?? 1, a: m.color?.a },
            }));
            const lasers: SerializedLaser[] = lasersRaw.map((l: any) => ({
                position: { x: l.position?.x ?? 0, y: l.position?.y ?? 0, z: l.position?.z ?? 0 },
                isBusy: !!l.isBusy,
                shootTime: typeof l.shootTime === "number" ? l.shootTime : 0,
            }));
            return { houses, missiles, lasers, timestamp: Date.now() };
        };

        return snapshotFromState();
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

        const emitSnapshotFromState = () => {
            const state: any = (room as any).state;
            if (!state) return;
            const mapLikeToArray = (m: any): any[] => {
                if (!m) return [];
                if (Array.isArray(m)) return m;
                if (typeof m.forEach === "function" && !Array.isArray(m)) {
                    const arr: any[] = [];
                    m.forEach((v: any) => arr.push(v));
                    return arr;
                }
                return Object.values(m);
            };
            const housesRaw = mapLikeToArray(state.houses);
            const missilesRaw = mapLikeToArray(state.missiles);
            const lasersRaw = mapLikeToArray(state.lasers);
            const data: SerializedRoomData = {
                houses: housesRaw.map((h: any) => ({
                    position: { x: h.position?.x ?? 0, y: h.position?.y ?? 0, z: h.position?.z ?? 0 },
                    size: { x: h.size?.x ?? 4, y: h.size?.y ?? 10, z: h.size?.z ?? 4 },
                    color: { r: h.color?.r ?? 1, g: h.color?.g ?? 1, b: h.color?.b ?? 1, a: h.color?.a },
                    isDestroyed: !!h.isDestroyed,
                    isHit: !!h.isHit,
                })),
                missiles: missilesRaw.map((m: any) => ({
                    id: m.id,
                    position: { x: m.position?.x ?? 0, y: m.position?.y ?? 0, z: m.position?.z ?? 0 },
                    target: { x: m.target?.x ?? 0, y: m.target?.y ?? 0, z: m.target?.z ?? 0 },
                    speed: typeof m.speed === "number" ? m.speed : 1,
                    verticalVelocity: typeof m.verticalVelocity === "number" ? m.verticalVelocity : 0,
                    isActive: !!m.isActive,
                    isHit: !!m.isHit,
                    color: { r: m.color?.r ?? 1, g: m.color?.g ?? 1, b: m.color?.b ?? 1, a: m.color?.a },
                })),
                lasers: lasersRaw.map((l: any) => ({
                    position: { x: l.position?.x ?? 0, y: l.position?.y ?? 0, z: l.position?.z ?? 0 },
                    isBusy: !!l.isBusy,
                    shootTime: typeof l.shootTime === "number" ? l.shootTime : 0,
                })),
                timestamp: Date.now(),
            };
            callback(data);
        };

        const msgHandler = (payload: SerializedRoomData) => callback(payload ?? null);
        room.onMessage("roomData", msgHandler);
        room.send("subscribeRoomData");

        // Also mirror server state changes (covers onCreated snapshots when no custom message is sent)
        const stateHandler = (_s: any) => emitSnapshotFromState();
        room.onStateChange(stateHandler);
        // Emit an initial snapshot immediately
        emitSnapshotFromState();
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
        room.send("registerPlayer", { role, fid });
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
            let resolved = false;
            const handler = (payload: PlayerInfo | null) => {
                if (resolved) return;
                resolved = true;
                resolve(payload);
            };
            room.onMessage("currentPlayerInfo", handler as any);
            setTimeout(() => {
                if (resolved) return;
                resolved = true;
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
            let resolved = false;
            const handler = (payload: PlayerInfo[]) => {
                if (resolved) return;
                resolved = true;
                resolve(payload || []);
            };
            room.onMessage("allPlayers", handler as any);
            setTimeout(() => {
                if (resolved) return;
                resolved = true;
                resolve([]);
            }, 1500);
        });
    } catch (error) {
        console.error("Failed to get all players via Colyseus:", error);
        return [];
    }
}



export async function getCurrentPlayerName(): Promise<string | null> {
    try {
        const room = await getRoom();
        const sessionId = room.sessionId;

        const tryGetName = (): string | null => {
            const state: any = (room as any).state;
            if (!state || !state.players) return null;
            const players: any = state.players;
            // Handle MapSchema-like structures
            if (typeof players.forEach === "function" && !Array.isArray(players)) {
                let found: string | null = null;
                players.forEach((p: any, key: string) => {
                    const pid = (p && (p.id ?? p.sessionId)) ?? key;
                    if (pid === sessionId) {
                        found = p.name ?? null;
                    }
                });
                return found;
            }
            // Handle arrays or plain objects
            const iterable: any[] = Array.isArray(players) ? players : Object.values(players);
            for (const p of iterable) {
                const pid = p && (p.id ?? p.sessionId);
                if (pid === sessionId) return p.name ?? null;
            }
            return null;
        };

        const immediate = tryGetName();
        if (immediate) return immediate;

        return await new Promise<string | null>((resolve) => {
            let resolved = false;
            const handler = (_state: any) => {
                if (resolved) return;
                const name = tryGetName();
                if (name) {
                    resolved = true;
                    resolve(name);
                    try { (room as any).off?.("statechange", handler); } catch (_e) { /* noop */ }
                }
            };
            room.onStateChange(handler);
            setTimeout(() => {
                if (resolved) return;
                resolved = true;
                resolve(null);
            }, 2000);
        });
    } catch (_e) {
        return null;
    }
}

export interface RoomPlayer {
    id: string;
    name: string;
    score: number;
    role: PlayerRole;
}

export async function listenToPlayers(callback: (players: RoomPlayer[]) => void): Promise<() => void> {
    const room = await getRoom();
    const mapStateToPlayers = (): RoomPlayer[] => {
        const state: any = (room as any).state;
        if (!state || !state.players) return [];
        const raw = state.players;
        const result: RoomPlayer[] = [];
        if (typeof raw.forEach === "function" && !Array.isArray(raw)) {
            raw.forEach((p: any, key: string) => {
                if (!p) return;
                const id = (p.id ?? p.sessionId ?? key) as string;
                result.push({
                    id,
                    name: p.name ?? "",
                    score: typeof p.score === "number" ? p.score : 0,
                    role: (p.role as PlayerRole) ?? PlayerRole.DEFENDER,
                });
            });
        } else {
            const iterable: any[] = Array.isArray(raw) ? raw : Object.values(raw);
            for (const p of iterable) {
                if (!p) continue;
                const id = (p.id ?? p.sessionId) as string;
                if (!id) continue;
                result.push({
                    id,
                    name: p.name ?? "",
                    score: typeof p.score === "number" ? p.score : 0,
                    role: (p.role as PlayerRole) ?? PlayerRole.DEFENDER,
                });
            }
        }
        return result;
    };

    const emit = () => callback(mapStateToPlayers());
    emit();
    const handler = (_state: any) => emit();
    room.onStateChange(handler);
    return () => {
        try { (room as any).off?.("statechange", handler); } catch (_e) { /* noop */ }
    };
}