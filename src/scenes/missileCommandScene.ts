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
import type { GameState, SceneContext } from "./missileCommand/types";
import { createGround as createGroundEnv, createHouses as createHousesEnv } from "./missileCommand/environment";
import { createLaserSystems as createLaserSystemsSys, createPlusMarker as createPlusMarkerMesh, findNearestAvailableLaser as findNearestLaser, updateLasers as updateLasersSys } from "./missileCommand/lasers";
import { updateMissiles as updateMissilesSys, dropMissileAt } from "./missileCommand/missiles";

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
    private dropPanel!: Mesh;
    private cursor!: Mesh;
    private cursorDot!: Mesh;
    private isPointerDown: boolean = false;
    private cursorDotDirection: 1 | -1 = 1;
    private cursorDotSpeed: number = 80; // units per second (in local Y)
    private cursorHalfHeight: number = 0;
    private cursorDotRadius: number = 0;
    private camera!: ArcRotateCamera;
    private shadowGenerator!: ShadowGenerator;
    private missileSpawnInterval: number = 3000; // 3 seconds
    private missileSpawnTimerRef = { value: 0 };

    createScene = async (
        engine: AbstractEngine,
        canvas: HTMLCanvasElement
    ): Promise<Scene> => {
        // Create scene
        this.scene = new Scene(engine);
        this.scene.clearColor = new Color4(0.1, 0.05, 0.34, 1); // Dark purple background

        // void Promise.all([
        //     import("@babylonjs/core/Debug/debugLayer"),
        //     import("@babylonjs/inspector"),
        // ]).then((_values) => {
        //     this.scene.debugLayer.show({
        //         handleResize: true,
        //         overlay: true,
        //     });
        // });

        // Setup camera
        this.setupCamera(canvas);
        
        // Setup lighting
        this.setupLighting();
        
        // Create ground
        this.createGround();

        // Create laser systems
        this.createLaserSystems();

        // Create houses
        this.createHouses();

        // Create cursor
        this.createCursor();

        // Setup input handling
        this.setupInputHandling();

        // Create drop panel
        this.createDropPanel();
        
        // Start game loop
        this.startGameLoop();

        return this.scene;
    };

    private getCtx(): SceneContext {
        return {
            scene: this.scene,
            shadowGenerator: this.shadowGenerator,
            gameState: this.gameState,
        };
    }

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
        this.ground = createGroundEnv(this.getCtx());
    }

    private createDropPanel(): void {
        // Match ground diameter (60) and set height small so it's a panel, positioned at y=75
        this.dropPanel = MeshBuilder.CreateCylinder("dropPanel", {
            height: 0.5,
            diameter: 60,
            tessellation: 32
        }, this.scene);
        this.dropPanel.position = new Vector3(0, 75, 0);

        const mat = new StandardMaterial("dropPanelMaterial", this.scene);
        mat.diffuseColor = new Color3(0.2, 0.2, 0.6);
        mat.alpha = 0.15;
        this.dropPanel.material = mat;
        this.dropPanel.isPickable = true;
    }

    private createHouses(): void {
        createHousesEnv(this.getCtx());
    }

    private createLaserSystems(): void {
        createLaserSystemsSys(this.getCtx());
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
        const pickInfo = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (mesh) => mesh === this.ground || mesh === this.dropPanel
        );
        if (pickInfo?.hit && (pickInfo.pickedMesh === this.ground || pickInfo.pickedMesh === this.dropPanel)) {
            this.isPointerDown = true;
        }

    }

    private handleMouseUp(): void {
        const pickInfo = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (mesh) => mesh === this.ground || mesh === this.dropPanel
        );
        if (pickInfo?.hit) {
            this.isPointerDown = false;
            if (pickInfo.pickedMesh === this.dropPanel) {
                const p = pickInfo.pickedPoint!;
                dropMissileAt(this.getCtx(), p.x, p.z);
            } else if (pickInfo.pickedMesh === this.ground) {
                this.addMarker(this.cursorDot.getAbsolutePosition().clone());
                this.resetCursorDot();
            }
        }
    }

    private addMarker(position: Vector3): void {
        const availableLaser = findNearestLaser(this.getCtx(), position);
        if (!availableLaser) return;

        const markerMesh = createPlusMarkerMesh(this.getCtx(), position);
        const marker = {
            position,
            time: 0,
            isDone: false,
            assignedLaser: availableLaser,
            mesh: markerMesh
        };
        this.gameState.markers.push(marker);

        availableLaser.isBusy = true;
        availableLaser.target = position.clone();
        availableLaser.currentMarker = marker;

        const start = new Vector3(availableLaser.position.x, 3.5, availableLaser.position.z);
        const end = marker.mesh.position.clone();
        const direction = end.subtract(start);
        const totalLength = direction.length();
        const normalizedDir = direction.normalize();

        const beam = MeshBuilder.CreateLines("laserBeam", {
            points: [start, start],
            updatable: true
        }, this.scene);
        const beamMaterial = new StandardMaterial("beamMaterial", this.scene);
        beamMaterial.diffuseColor = new Color3(0, 0.2, 0);
        beamMaterial.emissiveColor = new Color3(0, 1, 0);
        beam.material = beamMaterial;
        beam.isPickable = false;

        availableLaser.beamMesh = beam;
        availableLaser.beamCurrentLength = 0;
        availableLaser.beamTotalLength = totalLength;
        availableLaser.beamDirection = normalizedDir;
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
        updateMissilesSys(this.getCtx(), this.missileSpawnInterval, this.missileSpawnTimerRef);
    }

    

    private updateLasers(): void {
        updateLasersSys(this.getCtx());
    }

    private updateMarkers(): void {
        for (let i = this.gameState.markers.length - 1; i >= 0; i--) {
            const marker = this.gameState.markers[i];
            if (marker.isDone) {
                marker.mesh.dispose();
                this.gameState.markers.splice(i, 1);
                continue;
            }
        }
    }

    

    

    private checkGameOver(): void {
        const remainingHouses = this.gameState.houses.filter(h => !h.isDestroyed).length;
        const remainingLasers = this.gameState.lasers.filter(l => !l.isBusy).length;
        
        if (remainingHouses === 0 || remainingLasers === 0) {
            this.gameState.isGameOver = true;
			console.log("Game Over! Score:", this.gameState.score);
			// Notify UI layer
			try {
				window.dispatchEvent(new CustomEvent("gameover", {
					detail: {
						score: this.gameState.score,
						reason: remainingHouses === 0 ? "all-houses-destroyed" : "no-available-lasers"
					}
				}));
			} catch (_e) {
				// no-op: in non-browser envs
			}
        }
    }
}

export default new MissileCommandScene();
