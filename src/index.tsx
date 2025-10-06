import { render } from "solid-js/web";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { getSceneModule } from "./createScene";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { generateRandomHash } from "./utils/roomNumber";
import "./index.css";

// Create the renderCanvas element
const createRenderCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.id = "renderCanvas";
    canvas.width = 1152;
    canvas.height = 768;
    canvas.style.display = "block";
    canvas.className = "mx-auto";
    return canvas;
};

export const babylonInit = async (container: HTMLElement): Promise<void> => {
    const createSceneModule = getSceneModule();
    const engineType =
        location.search.split("engine=")[1]?.split("&")[0] || "webgl";

    // Execute the pretasks, if defined
    await Promise.all(createSceneModule.preTasks || []);
    
    // Create canvas element
    const canvas = createRenderCanvas();
    container.appendChild(canvas);
    
    // Generate the BABYLON 3D engine
    let engine: AbstractEngine;
    if (engineType === "webgpu") {
        const webGPUSupported = await WebGPUEngine.IsSupportedAsync;
        if (webGPUSupported) {
            // You can decide which WebGPU extensions to load when creating the engine. I am loading all of them
            await import("@babylonjs/core/Engines/WebGPU/Extensions/");
            const webgpu = new WebGPUEngine(canvas, {
                adaptToDeviceRatio: true,
                antialias: true,
            });
            await webgpu.initAsync();
            engine = webgpu;
        } else {
            engine = new Engine(canvas, true);
        }
    } else {
        engine = new Engine(canvas, true);
    }

    // Create the scene
    const scene = await createSceneModule.createScene(engine, canvas);

    // JUST FOR TESTING. Not needed for anything else
    (window as any).scene = scene;

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
        scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
    });
};

function App() {
    const [gameStarted, setGameStarted] = createSignal(false);
    const [isLoading, setIsLoading] = createSignal(false);
    const [isGameOver, setIsGameOver] = createSignal(false);
    const [finalScore, setFinalScore] = createSignal(0);
    const [gameOverReason, setGameOverReason] = createSignal<string | undefined>(undefined);

    const startGame = async () => {
        setIsLoading(true);
        setGameStarted(true);
        setIsGameOver(false);
        setFinalScore(0);
        setGameOverReason(undefined);
        
        // Generate a random hash and navigate to it
        const roomHash = generateRandomHash();
        window.location.hash = roomHash;
        console.log("Generated room hash:", roomHash);
        
        try {
            const container = document.getElementById("game-container");
            if (container) {
                await babylonInit(container);
                console.log("Babylon.js scene initialized successfully");
            }
        } catch (error) {
            console.error("Failed to initialize Babylon.js scene:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGameOver = (e: Event) => {
        const ce = e as CustomEvent<{ score: number; reason?: string }>;
        setFinalScore(ce.detail?.score ?? 0);
        setGameOverReason(ce.detail?.reason);
        setIsGameOver(true);
    };

    onMount(() => {
        window.addEventListener("gameover", handleGameOver as EventListener);
    });

    onCleanup(() => {
        window.removeEventListener("gameover", handleGameOver as EventListener);
    });

    const restart = () => {
        // simplest: reload to reset scene and state
        location.reload();
    };

    return (
        <div class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
            {!gameStarted() ? (
                <div class="text-center space-y-8">
                    <div class="space-y-4">
                        <h1 class="text-6xl font-bold text-white mb-4">
                            Missile Command
                        </h1>
                        <p class="text-xl text-gray-300 opacity-75">
                            Defend your cities from incoming missiles!
                        </p>
                    </div>
                    <button
                        class="btn btn-primary btn-lg text-lg px-8 py-4"
                        onClick={startGame}
                        disabled={isLoading()}
                    >
                        {isLoading() ? (
                            <>
                                <span class="loading loading-spinner loading-md"></span>
                                Loading...
                            </>
                        ) : (
                            "Start Game"
                        )}
                    </button>
                </div>
            ) : (
                <div class="relative w-full h-full flex items-center justify-center">
                    <div id="game-container" class="w-full h-full flex items-center justify-center" />
                    <Show when={isGameOver()}>
                        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                            <div class="bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl text-center space-y-6 max-w-sm w-full mx-4">
                                <h2 class="text-3xl font-bold text-white">Game Over</h2>
                                <div class="text-gray-300">
                                    <div class="text-lg">Score: <span class="font-semibold text-white">{finalScore()}</span></div>
                                    <Show when={gameOverReason()}>
                                        <div class="text-sm opacity-75 mt-1">Reason: {gameOverReason()}</div>
                                    </Show>
                                </div>
                                <div class="flex gap-3 justify-center">
                                    <button class="btn btn-primary" onClick={restart}>Restart</button>
                                </div>
                            </div>
                        </div>
                    </Show>
                </div>
            )}
        </div>
    );
}

// Initialize the SolidJS app
render(() => <App />, document.getElementById("app")!);