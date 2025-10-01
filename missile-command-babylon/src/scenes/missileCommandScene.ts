import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { type CreateSceneClass } from "../createScene";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";

import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";

import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Culling/ray";

// Game constants
const COLORS = [
    new Color4(1, 0.34, 0.2, 0.5), // Bright Red-Orange
    new Color4(0.2, 1, 0.34, 0.5), // Bright Green
    new Color4(0.34, 0.2, 1, 0.5), // Vibrant Blue-Purple
    new Color4(1, 0.84, 0, 0.5), // Gold
    new Color4(1, 0.41, 0.71, 0.5), // Hot Pink
    new Color4(0, 0.81, 0.82, 0.5), // Dark Turquoise
    new Color4(1, 0.65, 0, 0.5), // Orange
    new Color4(0.54, 0.17, 0.89, 0.5), // Blue Violet
    new Color4(0.13, 0.55, 0.13, 0.5), // Forest Green
    new Color4(1, 0.27, 0, 0.5) // Orange Red
];

// Game state
interface GameState {
    houses: House[];
    missiles: Missile[];
    lasers: LaserSystem[];
    markers: Marker[];
    isGameOver: boolean;
    score: number;
}

interface House {
    mesh: Mesh;
    position: Vector3;
    size: Vector3;
    color: Color4;
    isHit: boolean;
    isDestroyed: boolean;
}

interface Missile {
    mesh: Mesh;
    position: Vector3;
    target: Vector3;
    speed: number;
    isActive: boolean;
    isHit: boolean;
    color: Color4;
}

interface LaserSystem {
    mesh: Mesh;
    position: Vector3;
    isBusy: boolean;
    target?: Vector3;
    shootTime: number;
    color: Color4;
}

interface Marker {
    position: Vector3;
    time: number;
    isDone: boolean;
    assignedLaser?: LaserSystem;
    mesh: Mesh;
}

export class MissileCommandScene implements CreateSceneClass {
    private scene!: Scene;
    private gameState: GameState = {
        houses: [],
        missiles: [],
        lasers: [],
        markers: [],
        isGameOver: false,
        score: 0
    };
    
    private ground!: Mesh;
    private cursor!: Mesh;
    private cursorDot!: Mesh;
    private isPointerDown: boolean = false;
    private cursorDotDirection: 1 | -1 = 1;
    private cursorDotSpeed: number = 40; // units per second (in local Y)
    private cursorHalfHeight: number = 0;
    private cursorDotRadius: number = 0;
    private camera!: ArcRotateCamera;
    private shadowGenerator!: ShadowGenerator;
    private missileSpawnTimer: number = 0;
    private missileSpawnInterval: number = 2000; // 2 seconds

    createScene = async (
        engine: AbstractEngine,
        canvas: HTMLCanvasElement
    ): Promise<Scene> => {
        // Create scene
        this.scene = new Scene(engine);
        this.scene.clearColor = new Color4(0.1, 0.05, 0.34, 1); // Dark purple background

        void Promise.all([
            import("@babylonjs/core/Debug/debugLayer"),
            import("@babylonjs/inspector"),
        ]).then((_values) => {
            this.scene.debugLayer.show({
                handleResize: true,
                overlay: true,
            });
        });

        // Setup camera
        this.setupCamera(canvas);
        
        // Setup lighting
        this.setupLighting();
        
        // Create ground
        this.createGround();
        
        // Create houses
        this.createHouses();
        
        // Create laser systems
        this.createLaserSystems();
        
        // Create cursor
        this.createCursor();
        
        // Setup input handling
        this.setupInputHandling();
        
        // Start game loop
        this.startGameLoop();

        return this.scene;
    };

    private setupCamera(canvas: HTMLCanvasElement): void {
        this.camera = new ArcRotateCamera(
            "camera",
            -Math.PI / 2,
            Math.PI / 3,
            150,
            Vector3.Zero(),
            this.scene
        );
        this.camera.setTarget(new Vector3(0, 30, 0));
        this.camera.attachControl(canvas, true);
        this.camera.wheelPrecision = 50;
        this.camera.pinchPrecision = 50;
    }

    private setupLighting(): void {
        // Ambient light
        const ambientLight = new HemisphericLight("ambient", new Vector3(0, 1, 0), this.scene);
        ambientLight.intensity = 0.3;

        // Directional light for shadows
        const directionalLight = new DirectionalLight("directional", new Vector3(0, -1, 1), this.scene);
        directionalLight.intensity = 0.7;
        directionalLight.position = new Vector3(0, 20, 0);

        // Shadow generator
        this.shadowGenerator = new ShadowGenerator(1024, directionalLight);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurScale = 2;
        this.shadowGenerator.setDarkness(0.2);
    }

    private createGround(): void {
        // Create circular ground
        this.ground = MeshBuilder.CreateCylinder("ground", {
            height: 1,
            diameter: 60,
            tessellation: 32
        }, this.scene);
        
        this.ground.position.y = 0;
        
        // Ground material
        const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
        groundMaterial.diffuseColor = new Color3(0.85, 0.78, 0.98); // Light purple
        groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
        this.ground.material = groundMaterial;
        this.ground.receiveShadows = true;
    }

    private createHouses(): void {
        const numHouses = 10;
        const groundRadius = 30;
        
        for (let i = 0; i < numHouses; i++) {
            const house = this.createSingleHouse(groundRadius);
            if (house) {
                this.gameState.houses.push(house);
            }
        }
    }

    private createSingleHouse(groundRadius: number): House | null {
        const maxAttempts = 100;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * (groundRadius - 5);
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            const y = 0;
            
            const position = new Vector3(x, y, z);
            const size = new Vector3(
                Math.random() * 8 + 4, // width: 4-12
                Math.random() * 15 + 10, // height: 10-25
                Math.random() * 8 + 4  // depth: 4-12
            );
            
            // Check if position is valid (not overlapping with other houses)
            if (this.isValidHousePosition(position, size)) {
                const houseMesh = MeshBuilder.CreateBox("house", {
                    width: size.x,
                    height: size.y,
                    depth: size.z
                }, this.scene);

                houseMesh.isPickable = false;
                houseMesh.position = position;
                houseMesh.position.y = + size.y / 2;
                
                // Random color
                const colorIndex = Math.floor(Math.random() * COLORS.length);
                const houseMaterial = new StandardMaterial("houseMaterial", this.scene);
                houseMaterial.diffuseColor = new Color3(
                    COLORS[colorIndex].r,
                    COLORS[colorIndex].g,
                    COLORS[colorIndex].b
                );
                houseMaterial.alpha = 0.8;
                houseMesh.material = houseMaterial;
                // houseMesh.receiveShadows = true;
                this.shadowGenerator.getShadowMap()!.renderList!.push(houseMesh);
                
                return {
                    mesh: houseMesh,
                    position,
                    size,
                    color: COLORS[colorIndex],
                    isHit: false,
                    isDestroyed: false
                };
            }
            
            attempts++;
        }
        
        return null;
    }

    private isValidHousePosition(position: Vector3, size: Vector3): boolean {
        // Check if house is within ground bounds
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
        if (distanceFromCenter + Math.max(size.x, size.z) / 2 > 30) {
            return false;
        }
        
        // Check for overlap with existing houses
        for (const house of this.gameState.houses) {
            const dx = Math.abs(position.x - house.position.x);
            const dz = Math.abs(position.z - house.position.z);
            
            if (dx < (size.x + house.size.x) / 2 && dz < (size.z + house.size.z) / 2) {
                return false;
            }
        }
        
        return true;
    }

    private createLaserSystems(): void {
        const laserPositions = [
            new Vector3(25, 0, 5),
            new Vector3(-15, 0, 20),
            new Vector3(-5, 0, -25)
        ];
        
        for (let i = 0; i < laserPositions.length; i++) {
            const position = laserPositions[i];
            const laserMesh = this.createLaserMesh(position);
            
            this.gameState.lasers.push({
                mesh: laserMesh,
                position,
                isBusy: false,
                shootTime: 0,
                color: new Color4(0, 1, 0, 1)
            });
        }
    }

    private createLaserMesh(position: Vector3): Mesh {
        // Create laser base (cylinder)
        const base = MeshBuilder.CreateCylinder("laserBase", {
            height: 5.6,
            diameterTop: 0,
            diameterBottom: 6,
        }, this.scene);

        base.position = position.clone();
        base.position.y += 2.8;

        // Create laser head (cone)
        const head = MeshBuilder.CreateCylinder("laserHead", {
            height: 2,
            diameterTop: 8,
            diameterBottom: 0
        }, this.scene);

        head.position = position.clone();
        head.position.y += 3.5;

        // Merge base and head into one mesh
        const laserMesh = Mesh.MergeMeshes([base, head], true, true, undefined, false, true)!;

        // Material
        const laserMaterial = new StandardMaterial("laserMaterial", this.scene);
        laserMaterial.diffuseColor = new Color3(0.3, 0.8, 0.3);
        laserMaterial.emissiveColor = new Color3(0.1, 0.3, 0.1);
        laserMesh.material = laserMaterial;

        laserMesh.receiveShadows = true;
        this.shadowGenerator.getShadowMap()!.renderList!.push(laserMesh);

        return laserMesh;
    }

    private createCursor(): void {
        const cylinder = MeshBuilder.CreateCylinder("cursor", {
            height: 50,
            diameter: 1.5,
        }, this.scene);
        cylinder.position.y += 10;

        this.cursor = cylinder;
        this.cursor.isVisible = false;
        
        const cursorMaterial = new StandardMaterial("cursorMaterial", this.scene);
        cursorMaterial.diffuseColor = new Color3(1, 0.6, 0.4);
        cursorMaterial.emissiveColor = new Color3(170/255, 243/255, 9/255);
        cursorMaterial.alpha = 0.6;
        this.cursor.material = cursorMaterial;

        const sphereDiameter = 1.2;
        const sphere = MeshBuilder.CreateSphere("cursorDot", { diameter: sphereDiameter, segments: 16 }, this.scene);
        sphere.parent = cylinder;
        this.cursorHalfHeight = cylinder.getBoundingInfo().boundingBox.extendSize.y;
        this.cursorDotRadius = sphere.getBoundingInfo().boundingSphere.radius;
        sphere.position.y = -this.cursorHalfHeight + this.cursorDotRadius;

        const dotMaterial = new StandardMaterial("cursorDotMaterial", this.scene);
        dotMaterial.diffuseColor = new Color3(1, 0, 0);
        dotMaterial.emissiveColor = new Color3(0.5, 0, 0);
        sphere.material = dotMaterial;
        this.cursorDot = sphere;
    }

    private updateCursorPos(pos: Vector3): void {
        const p = pos.clone();
        p.y += 25;
        this.cursor.position = p;
    }

    private updateCursorVisibility(visible: boolean): void {
        this.cursor.isVisible = visible;
        this.cursorDot.isVisible = visible;
    }

    private resetCursorDot(): void {
        this.cursorDot.position.y = -this.cursorHalfHeight + this.cursorDotRadius;
        this.cursorDotDirection = 1;
        this.cursorDotSpeed = 20;
    }

    private setupInputHandling(): void {
        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERMOVE:
                    this.handleMouseMove();
                    break;
                case PointerEventTypes.POINTERDOWN:
                    this.handleMouseDown();
                    break;
                case PointerEventTypes.POINTERUP:
                    this.handleMouseUp();
                    break;
            }
        });
    }

    private handleMouseMove(): void {
        const pickInfo = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (mesh) => mesh === this.ground
        );

        if (pickInfo?.hit && pickInfo.pickedMesh === this.ground) {
            const position = pickInfo.pickedPoint!;
            this.updateCursorPos(position)
            this.updateCursorVisibility(true);
        } else {
            this.updateCursorVisibility(false);
        }
    }

    private handleMouseDown(): void {
        this.isPointerDown = true;
    }

    private handleMouseUp(): void {
        this.isPointerDown = false;
        this.addMarker(this.cursorDot.getAbsolutePosition().clone());
        this.resetCursorDot();
    }

    private addMarker(position: Vector3): void {
        // Find nearest available laser
        const availableLaser = this.findNearestAvailableLaser(position);
        if (availableLaser) {
            const markerMesh = this.createPlusMarker(position);
            this.gameState.markers.push({
                position,
                time: 0,
                isDone: false,
                assignedLaser: availableLaser,
                mesh: markerMesh
            });
            availableLaser.isBusy = true;
        }
    }

    private findNearestAvailableLaser(position: Vector3): LaserSystem | null {
        let nearestLaser: LaserSystem | null = null;
        let minDistance = Infinity;
        
        for (const laser of this.gameState.lasers) {
            if (laser.isBusy) continue;
            
            const distance = Vector3.Distance(laser.position, position);
            if (distance < minDistance) {
                minDistance = distance;
                nearestLaser = laser;
            }
        }
        
        return nearestLaser;
    }

    private startGameLoop(): void {
        this.scene.onBeforeRenderObservable.add(() => {
            this.updateGame();
        });
    }

    private updateGame(): void {
        if (this.gameState.isGameOver) return;
        
        this.updateMissiles();
        this.updateLasers();
        this.updateMarkers();
        this.updateCursorDot();
        this.checkGameOver();
    }

    private updateCursorDot(): void {
        if (!this.cursorDot || !this.cursor) return;
        if (!this.isPointerDown) {
            this.resetCursorDot();
            return;
        }

        const deltaTimeSeconds = this.scene.getEngine().getDeltaTime() / 1000;
        const movement = this.cursorDotSpeed * deltaTimeSeconds * this.cursorDotDirection;

        let newY = this.cursorDot.position.y + movement;
        const minY = -this.cursorHalfHeight + this.cursorDotRadius;
        const maxY = this.cursorHalfHeight - this.cursorDotRadius;

        if (newY > maxY) {
            newY = maxY;
            this.cursorDotDirection = -1;
        } else if (newY < minY) {
            newY = minY;
            this.cursorDotDirection = 1;
        }

        this.cursorDot.position.y = newY;
    }

    private updateMissiles(): void {
        // Spawn new missiles
        this.missileSpawnTimer += this.scene.getEngine().getDeltaTime();
        if (this.missileSpawnTimer >= this.missileSpawnInterval) {
            this.spawnMissile();
            this.missileSpawnTimer = 0;
        }
        
        // Update existing missiles
        for (let i = this.gameState.missiles.length - 1; i >= 0; i--) {
            const missile = this.gameState.missiles[i];
            if (!missile.isActive) {
                this.gameState.missiles.splice(i, 1);
                continue;
            }
            
            this.updateMissile(missile);
        }
    }

    private spawnMissile(): void {
        const groundRadius = 30;
        const startHeight = 50;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * groundRadius;
        const startX = Math.cos(angle) * distance;
        const startZ = Math.sin(angle) * distance;
        
        const targetX = Math.random() * groundRadius * 2 - groundRadius;
        const targetZ = Math.random() * groundRadius * 2 - groundRadius;
        
        const missileMesh = MeshBuilder.CreateSphere("missile", { diameter: 1 }, this.scene);
        missileMesh.position = new Vector3(startX, startHeight, startZ);
        
        const missileMaterial = new StandardMaterial("missileMaterial", this.scene);
        const colorIndex = Math.floor(Math.random() * COLORS.length);
        missileMaterial.diffuseColor = new Color3(
            COLORS[colorIndex].r,
            COLORS[colorIndex].g,
            COLORS[colorIndex].b
        );
        missileMesh.material = missileMaterial;
        
        this.gameState.missiles.push({
            mesh: missileMesh,
            position: missileMesh.position.clone(),
            target: new Vector3(targetX, 0, targetZ),
            speed: 0.02,
            isActive: true,
            isHit: false,
            color: COLORS[colorIndex]
        });
    }

    private updateMissile(missile: Missile): void {
        if (missile.isHit) return;
        
        // Move missile towards target
        const direction = missile.target.subtract(missile.position).normalize();
        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
        const movement = direction.scale(missile.speed * deltaTime * 100);
        
        missile.position.addInPlace(movement);
        missile.mesh.position = missile.position;
        
        // Check if missile reached ground
        if (missile.position.y <= 0) {
            this.explodeMissile(missile);
        }
        
        // Check collision with houses
        this.checkMissileHouseCollision(missile);
    }

    private explodeMissile(missile: Missile): void {
        missile.isActive = false;
        missile.mesh.dispose();
        
        // Check if missile hit any houses
        this.checkMissileHouseCollision(missile);
    }

    private checkMissileHouseCollision(missile: Missile): void {
        for (const house of this.gameState.houses) {
            if (house.isDestroyed) continue;
            
            const distance = Vector3.Distance(missile.position, house.position);
            if (distance < 3) { // Collision radius
                this.hitHouse(house);
                this.explodeMissile(missile);
                break;
            }
        }
    }

    private hitHouse(house: House): void {
        house.isHit = true;
        house.isDestroyed = true;
        
        // Change house color to red
        const hitMaterial = new StandardMaterial("hitMaterial", this.scene);
        hitMaterial.diffuseColor = new Color3(1, 0, 0);
        house.mesh.material = hitMaterial;
        
        // Remove house after delay
        setTimeout(() => {
            house.mesh.dispose();
        }, 1000);
    }

    private updateLasers(): void {
        for (const laser of this.gameState.lasers) {
            if (laser.isBusy) {
                laser.shootTime += this.scene.getEngine().getDeltaTime();
                
                // Simulate laser shooting
                if (laser.shootTime > 1000) { // 1 second
                    laser.isBusy = false;
                    laser.shootTime = 0;
                }
            }
        }
    }

    private updateMarkers(): void {
        for (let i = this.gameState.markers.length - 1; i >= 0; i--) {
            const marker = this.gameState.markers[i];
            if (marker.isDone) {
                marker.mesh.dispose();
                this.gameState.markers.splice(i, 1);
                continue;
            }
            
            marker.time += this.scene.getEngine().getDeltaTime();
            
            // Simulate laser travel time
            if (marker.time > 2000) { // 2 seconds
                this.fireLaser(marker);
                marker.isDone = true;
                if (marker.assignedLaser) {
                    marker.assignedLaser.isBusy = false;
                }
            }
        }
    }

    private createPlusMarker(position: Vector3): Mesh {
        const thickness = 0.3;
        const length = 6;

        const barX = MeshBuilder.CreateBox("markerBarX", {
            width: length,
            height: thickness,
            depth: thickness
        }, this.scene);

        const barZ = MeshBuilder.CreateBox("markerBarZ", {
            width: thickness,
            height: thickness,
            depth: length
        }, this.scene);

        const plusMesh = Mesh.MergeMeshes([barX, barZ], true, true, undefined, false, true)!;

        const markerMaterial = new StandardMaterial("markerMaterial", this.scene);
        markerMaterial.diffuseColor = new Color3(0, 0.2, 0);
        markerMaterial.emissiveColor = new Color3(0, 1, 0);
        plusMesh.material = markerMaterial;
        plusMesh.isPickable = false;

        plusMesh.position = new Vector3(position.x, Math.max(0.5, position.y), position.z);

        return plusMesh;
    }

    private fireLaser(marker: Marker): void {
        // Check if any missiles are in the explosion radius
        const explosionRadius = 10;
        
        for (let i = this.gameState.missiles.length - 1; i >= 0; i--) {
            const missile = this.gameState.missiles[i];
            if (!missile.isActive) continue;
            
            const distance = Vector3.Distance(missile.position, marker.position);
            if (distance < explosionRadius) {
                this.explodeMissile(missile);
                this.gameState.score += 10;
            }
        }
    }

    private checkGameOver(): void {
        const remainingHouses = this.gameState.houses.filter(h => !h.isDestroyed).length;
        const remainingLasers = this.gameState.lasers.filter(l => !l.isBusy).length;
        
        if (remainingHouses === 0 || remainingLasers === 0) {
            this.gameState.isGameOver = true;
            console.log("Game Over! Score:", this.gameState.score);
        }
    }
}

export default new MissileCommandScene();
