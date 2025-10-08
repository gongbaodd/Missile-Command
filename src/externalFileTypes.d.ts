// Images
declare module "*.jpg";
declare module "*.png";
declare module "*.env";

// 3D types
declare module "*.glb";
declare module "*.stl";

// Physics
declare module "ammo.js";

// Minimal types for yuka used in this project
declare module "yuka" {
    export class Vector3 {
        constructor(x?: number, y?: number, z?: number);
        x: number;
        y: number;
        z: number;
        clone(): Vector3;
        add(v: Vector3): Vector3;
        sub(v: Vector3): Vector3;
    }

    export class AABB {
        min: Vector3;
        max: Vector3;
        set(min: Vector3, max: Vector3): this;
        intersectsAABB(aabb: AABB): boolean;
    }
}