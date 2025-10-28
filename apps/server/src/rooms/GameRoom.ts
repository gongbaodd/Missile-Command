import { Room, Client } from "colyseus";
import { Schema, type, ArraySchema } from "@colyseus/schema";
import { generateUsername } from "unique-username-generator";
import { PlayerRole } from "../types";


class Player extends Schema {
	@type("string") id: string = "";
	@type("string") name: string = "";
	@type("number") score: number = 0;
	@type("string") role: PlayerRole;
}

class Vec3 extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;
}

class Rgb extends Schema {
    @type("number") r: number = 1;
    @type("number") g: number = 1;
    @type("number") b: number = 1;
}

class House extends Schema {
    @type(Vec3) position: Vec3 = new Vec3();
    @type(Vec3) size: Vec3 = new Vec3();
    @type(Rgb) color: Rgb = new Rgb();
    @type("boolean") isHit: boolean = false;
    @type("boolean") isDestroyed: boolean = false;
}

class Missile extends Schema {
    @type(Vec3) position: Vec3 = new Vec3();
    @type(Vec3) target: Vec3 = new Vec3();
    @type("number") speed: number = 0;
    @type("number") verticalVelocity: number = 0;
    @type("boolean") isActive: boolean = true;
    @type("boolean") isHit: boolean = false;
    @type(Rgb) color: Rgb = new Rgb();
    @type("string") id: string = "";
}

class Laser extends Schema {
    @type(Vec3) position: Vec3 = new Vec3();
    @type("boolean") isBusy: boolean = false;
    @type(Vec3) target?: Vec3;
    @type("number") shootTime: number = 0;
}

class Marker extends Schema {
    @type(Vec3) position: Vec3 = new Vec3();
    @type("number") time: number = 0;
    @type("boolean") isDone: boolean = false;
    @type("number") assignedLaserIndex: number = -1;
}

class GameState extends Schema {
    @type([Player]) players: ArraySchema<Player> = new ArraySchema<Player>();
    @type([House]) houses: ArraySchema<House> = new ArraySchema<House>();
    @type([Missile]) missiles: ArraySchema<Missile> = new ArraySchema<Missile>();
    @type([Laser]) lasers: ArraySchema<Laser> = new ArraySchema<Laser>();
    @type([Marker]) markers: ArraySchema<Marker> = new ArraySchema<Marker>();
    @type("boolean") isGameOver: boolean = false;
    @type("number") score: number = 0;
    @type("string") hash: string = "";
}

export class GameRoom extends Room<GameState> {
    state = new GameState();
    onCreate(options: { hash: string }) {
        this.state.hash = options.hash;

        this.onMessage("message", (client, message) => {
            console.log("ChatRoom received message from", client.sessionId, ":", message);
            this.broadcast("messages", `(${client.sessionId}) ${message}`);
        });

        // Scene commands
        this.onMessage("spawn_missile", (client, { x, z }: { x: number; z: number }) => {
            const player = this.findPlayer(client.sessionId);
            if (!player || player.role !== PlayerRole.ATTACKER) return;
            this.spawnMissile(x, z);
        });

        this.onMessage("add_marker", (client, { x, z }: { x: number; z: number }) => {
            const player = this.findPlayer(client.sessionId);
            if (!player || player.role !== PlayerRole.DEFENDER) return;
            this.addMarker(x, z);
        });

        // Initialize scene
        this.initializeScene();

        // Simulation at ~20 fps
        this.setSimulationInterval((deltaTime) => this.update(deltaTime), 50);
    }

    onJoin(client: Client, options: {
        role?: PlayerRole;
        fid: string;
    }) {
        const player = new Player();
        player.id = client.sessionId;
        player.name = generateUsername("-", 2, 20);
        player.role = options.role ?? PlayerRole.DEFENDER;
        this.state.players.push(player);

        this.broadcast("messages", `${ client.sessionId } joined.`);
    }

    onLeave(client: Client) {
        const idx = this.state.players.findIndex(p => p.id === client.sessionId);
        if (idx >= 0) this.state.players.splice(idx, 1);

        this.broadcast("messages", `${ client.sessionId } left.`);
    }

	onDispose() {
        console.log("Dispose ChatRoom");
	}

    private findPlayer(sessionId: string): Player | undefined {
        return this.state.players.find(p => p.id === sessionId);
    }

    private initializeScene(): void {
        this.initializeLasers();
        this.initializeHouses();
        this.state.isGameOver = false;
        this.state.score = 0;
    }

    private initializeLasers(): void {
        const positions: Array<[number, number, number]> = [
            [25, 0, 5],
            [-15, 0, 20],
            [-5, 0, -25]
        ];
        for (const [x, y, z] of positions) {
            const l = new Laser();
            l.position.x = x; l.position.y = y; l.position.z = z;
            l.isBusy = false; l.shootTime = 0;
            this.state.lasers.push(l);
        }
    }

    private initializeHouses(): void {
        const groundRadius = 30;
        const numHouses = 10;
        const lasers = this.state.lasers;

        let attempts = 0;
        const maxAttempts = 1000;
        while (this.state.houses.length < numHouses && attempts < maxAttempts) {
            attempts++;
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * (groundRadius - 5);
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            const sizeX = Math.random() * 8 + 4;
            const sizeY = Math.random() * 15 + 10;
            const sizeZ = Math.random() * 8 + 4;

            if (!this.isValidHousePosition(x, 0, z, sizeX, sizeY, sizeZ, groundRadius, lasers)) continue;

            const h = new House();
            h.position.x = x; h.position.y = 0; h.position.z = z;
            h.size.x = sizeX; h.size.y = sizeY; h.size.z = sizeZ;
            // random color
            h.color.r = Math.random();
            h.color.g = Math.random();
            h.color.b = Math.random();
            h.isHit = false; h.isDestroyed = false;
            this.state.houses.push(h);
        }
    }

    private isValidHousePosition(
        px: number, py: number, pz: number,
        sx: number, sy: number, sz: number,
        groundRadius: number,
        lasers: ArraySchema<Laser>
    ): boolean {
        const distanceFromCenter = Math.sqrt(px * px + pz * pz);
        if (distanceFromCenter + Math.max(sx, sz) / 2 > groundRadius) return false;

        // AABB intersection with existing houses
        const proposed = this.getAabb(px, py, pz, sx, sy, sz);
        for (const existing of this.state.houses) {
            const bb = this.getAabb(existing.position.x, existing.position.y, existing.position.z, existing.size.x, existing.size.y, existing.size.z);
            if (this.intersectsAabb(proposed, bb)) return false;
        }

        // Keep away from lasers (approximate as small AABBs)
        for (const laser of lasers) {
            const lx = laser.position.x, ly = 3.5, lz = laser.position.z;
            const laserAabb = this.getAabb(lx, ly, lz, 6, 7.6, 6);
            if (this.intersectsAabb(proposed, laserAabb)) return false;
        }
        return true;
    }

    private getAabb(x: number, y: number, z: number, sx: number, sy: number, sz: number) {
        return {
            min: { x: x - sx / 2, y: y - sy / 2, z: z - sz / 2 },
            max: { x: x + sx / 2, y: y + sy / 2, z: z + sz / 2 },
        };
    }

    private intersectsAabb(a: { min: any; max: any }, b: { min: any; max: any }): boolean {
        return (
            a.min.x <= b.max.x && a.max.x >= b.min.x &&
            a.min.y <= b.max.y && a.max.y >= b.min.y &&
            a.min.z <= b.max.z && a.max.z >= b.min.z
        );
    }

    private update(deltaTimeMs: number): void {
        if (this.state.isGameOver) return;
        const dt = Math.max(0.001, deltaTimeMs / 1000);

        this.updateMissiles(dt);
        this.updateLasers(dt);
        this.cleanupMarkers();
        this.checkGameOver();
    }

    private updateMissiles(dt: number): void {
        for (let i = this.state.missiles.length - 1; i >= 0; i--) {
            const m = this.state.missiles[i];
            if (!m.isActive) { this.state.missiles.splice(i, 1); continue; }

            // vertical gravity-like motion
            const gravity = -2;
            m.verticalVelocity += gravity * dt;
            const dy = m.verticalVelocity * dt;
            const toTargetX = m.target.x - m.position.x;
            const toTargetZ = m.target.z - m.position.z;
            const len = Math.hypot(toTargetX, toTargetZ);
            let dirX = 0, dirZ = 0;
            if (len > 0.0001) { dirX = toTargetX / len; dirZ = toTargetZ / len; }
            const horizontalSpeed = m.speed * 100;
            const dx = dirX * horizontalSpeed * dt;
            const dz = dirZ * horizontalSpeed * dt;
            m.position.x += dx; m.position.y += dy; m.position.z += dz;

            if (m.position.y <= 0) {
                this.explodeMissile(m);
                continue;
            }
            this.checkMissileHouseCollision(m);
        }
    }

    private updateLasers(dt: number): void {
        const beamSpeed = 40; // units/s
        for (let li = 0; li < this.state.lasers.length; li++) {
            const laser = this.state.lasers[li];
            if (!laser.isBusy || !laser.target) continue;
            laser.shootTime += dt;
            // when beam reaches target
            const startX = laser.position.x, startZ = laser.position.z;
            const dist = Math.hypot(laser.target.x - startX, laser.target.z - startZ);
            if (laser.shootTime * beamSpeed >= dist) {
                // resolve explosion at target
                this.resolveMarkerHit(li, laser.target.x, laser.target.z);
                laser.isBusy = false;
                laser.target = undefined;
                laser.shootTime = 0;
            }
        }
    }

    private cleanupMarkers(): void {
        for (let i = this.state.markers.length - 1; i >= 0; i--) {
            if (this.state.markers[i].isDone) this.state.markers.splice(i, 1);
        }
    }

    private checkGameOver(): void {
        const remainingHouses = this.state.houses.filter(h => !h.isDestroyed).length;
        const availableLasers = this.state.lasers.filter(l => !l.isBusy).length;
        if (remainingHouses === 0 || availableLasers === 0) {
            this.state.isGameOver = true;
        }
    }

    private explodeMissile(m: Missile): void {
        m.isActive = false;
        this.checkMissileHouseCollision(m);
    }

    private checkMissileHouseCollision(m: Missile): void {
        for (const h of this.state.houses) {
            if (h.isDestroyed) continue;
            const d = Math.hypot(m.position.x - h.position.x, m.position.z - h.position.z);
            if (d < 3) {
                this.hitHouse(h);
                m.isActive = false;
                return;
            }
        }
    }

    private hitHouse(h: House): void {
        h.isHit = true;
        h.isDestroyed = true;
    }

    private spawnMissile(x: number, z: number): void {
        const m = new Missile();
        m.position.x = x; m.position.y = 75; m.position.z = z;
        m.target = new Vec3(); m.target.x = x; m.target.y = 0; m.target.z = z;
        m.speed = 0; m.verticalVelocity = 0; m.isActive = true; m.isHit = false;
        m.color.r = Math.random(); m.color.g = Math.random(); m.color.b = Math.random();
        m.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.state.missiles.push(m);
    }

    private addMarker(x: number, z: number): void {
        const laserIndex = this.findNearestAvailableLaser(x, z);
        if (laserIndex < 0) return;
        const laser = this.state.lasers[laserIndex];
        laser.isBusy = true;
        const target = new Vec3(); target.x = x; target.y = 0; target.z = z;
        laser.target = target; laser.shootTime = 0;

        const marker = new Marker();
        marker.position.x = x; marker.position.y = 0; marker.position.z = z;
        marker.time = 0; marker.isDone = false; marker.assignedLaserIndex = laserIndex;
        this.state.markers.push(marker);
    }

    private resolveMarkerHit(laserIndex: number, x: number, z: number): void {
        const explosionRadius = 5;
        // score missiles destroyed
        for (const m of this.state.missiles) {
            if (!m.isActive) continue;
            const d = Math.hypot(m.position.x - x, m.position.z - z);
            if (d <= explosionRadius) {
                m.isActive = false;
                this.state.score += 10;
            }
        }
        // mark marker done
        const marker = this.state.markers.find(m => !m.isDone && m.assignedLaserIndex === laserIndex);
        if (marker) marker.isDone = true;
    }

    private findNearestAvailableLaser(x: number, z: number): number {
        let idx = -1; let minDist = Infinity;
        for (let i = 0; i < this.state.lasers.length; i++) {
            const l = this.state.lasers[i];
            if (l.isBusy) continue;
            const d = Math.hypot(l.position.x - x, l.position.z - z);
            if (d < minDist) { minDist = d; idx = i; }
        }
        return idx;
    }
}
