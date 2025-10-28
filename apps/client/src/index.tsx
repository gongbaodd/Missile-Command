import { render } from "solid-js/web";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { getSceneModule } from "./createScene";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import "./index.css";
import { registerPlayer, getCurrentPlayerInfo, checkRoomExists, getAllPlayersInRoom } from "./scenes/missileCommand/colyseus";
import { PlayerRole } from "./scenes/missileCommand/types";

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

export const babylonInit = async (container: HTMLElement, playerRole?: PlayerRole): Promise<void> => {

    console.log("playerRole", playerRole);
    const createSceneModule = getSceneModule(playerRole);
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
    const [playerRole, setPlayerRole] = createSignal<PlayerRole | null>(null);
    const [showStartGame, setShowStartGame] = createSignal(true);
    const [isCheckingHash, setIsCheckingHash] = createSignal(true);

    const checkHashAndPlayer = async () => {
        setIsCheckingHash(true);
        
        try {
            // Single-room server: always check the one room
            const roomExists = await checkRoomExists();
            if (roomExists) {
                const allPlayers = await getAllPlayersInRoom();
                const currentPlayerInfo = await getCurrentPlayerInfo();
                if (currentPlayerInfo) {
                    setPlayerRole(currentPlayerInfo.role);
                    setShowStartGame(false);
                } else {
                    if (allPlayers.length === 0) {
                        setShowStartGame(true);
                    } else if (allPlayers.length === 1) {
                        await registerPlayer(PlayerRole.ATTACKER);
                        setPlayerRole(PlayerRole.ATTACKER);
                        setShowStartGame(false);
                    } else {
                        setShowStartGame(false);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to check hash and player:", error);
        } finally {
            setIsCheckingHash(false);
        }
    };

    const startGame = async () => {
        setIsLoading(true);
        setGameStarted(true);
        setIsGameOver(false);
        setFinalScore(0);
        setGameOverReason(undefined);
        
        // The URL hash will be set to the Colyseus sessionId after connecting
        // in the networking layer; no need to generate one here.

        try {
            // Register this client as Defender in Firebase for this room
            await registerPlayer(PlayerRole.DEFENDER);

            const container = document.getElementById("game-container");
            if (container) {
                await babylonInit(container, PlayerRole.DEFENDER);
                console.log("Babylon.js scene initialized successfully");
            }
        } catch (error) {
            console.error("Failed to initialize Babylon.js scene:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const continueGame = async () => {
        setIsLoading(true);
        setGameStarted(true);
        setIsGameOver(false);
        setFinalScore(0);
        setGameOverReason(undefined);
        
        try {
            const container = document.getElementById("game-container");
            if (container) {
                await babylonInit(container, playerRole() || PlayerRole.DEFENDER);
                console.log("Babylon.js scene initialized successfully");
            }
        } catch (error) {
            console.error("Failed to initialize Babylon.js scene:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const selectRole = async (role: PlayerRole) => {
        setIsLoading(true);
        
        try {
            // Register the player with the selected role
            await registerPlayer(role);
            setPlayerRole(role);
            
            // Start the game with the selected role
            setGameStarted(true);
            setIsGameOver(false);
            setFinalScore(0);
            setGameOverReason(undefined);
            
            const container = document.getElementById("game-container");
            if (container) {
                await babylonInit(container, role);
                console.log("Babylon.js scene initialized successfully");
            }
        } catch (error) {
            console.error("Failed to select role and initialize game:", error);
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
        checkHashAndPlayer();
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
                    {isCheckingHash() ? (
                        <div class="flex items-center justify-center space-x-2">
                            <span class="loading loading-spinner loading-md"></span>
                            <span class="text-gray-300">Checking room...</span>
                        </div>
                    ) : !showStartGame() && !playerRole() ? (
                        <div class="text-center space-y-6">
                            <div class="text-xl text-yellow-400 font-semibold">
                                Choose Your Role
                            </div>
                            <p class="text-gray-300 opacity-75">
                                This room already has players. Choose which role you want to play:
                            </p>
                            <div class="flex gap-4 justify-center">
                                <div class="space-y-4">
                                    <img src={"/defender_instruction.png"} alt="Defender instructions" class="mx-auto max-h-[30vh] rounded shadow-xl" />
                                    <button
                                        class="btn btn-primary btn-lg text-lg px-8 py-4"
                                        onClick={() => selectRole(PlayerRole.DEFENDER)}
                                        disabled={isLoading()}
                                    >
                                        {isLoading() ? (
                                            <>
                                                <span class="loading loading-spinner loading-md"></span>
                                                Loading...
                                            </>
                                        ) : (
                                            "Play as Defender"
                                        )}
                                    </button>
                                </div>
                                <div class="space-y-4">
                                    <img src={"/attack_instruction.png"} alt="Attacker instructions" class="mx-auto max-h-[30vh] rounded shadow-xl" />
                                    <button
                                        class="btn btn-secondary btn-lg text-lg px-8 py-4"
                                        onClick={() => selectRole(PlayerRole.ATTACKER)}
                                        disabled={isLoading()}
                                    >
                                        {isLoading() ? (
                                            <>
                                                <span class="loading loading-spinner loading-md"></span>
                                                Loading...
                                            </>
                                        ) : (
                                            "Play as Attacker"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : showStartGame() ? (
                        <div class="space-y-6">
                            <img src={"/defender_instruction.png"} alt="Defender instructions" class="mx-auto max-h-[50vh] rounded shadow-xl" />
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
                        <div class="space-y-6">
                            {playerRole() === PlayerRole.DEFENDER ? (
                                <img src={"/defender_instruction.png"} alt="Defender instructions" class="mx-auto max-h-[50vh] rounded shadow-xl" />
                            ) : (
                                <img src={"/attack_instruction.png"} alt="Attacker instructions" class="mx-auto max-h-[50vh] rounded shadow-xl" />
                            )}
                            <button
                                class="btn btn-secondary btn-lg text-lg px-8 py-4"
                                onClick={continueGame}
                                disabled={isLoading()}
                            >
                                {isLoading() ? (
                                    <>
                                        <span class="loading loading-spinner loading-md"></span>
                                        Loading...
                                    </>
                                ) : playerRole() === PlayerRole.DEFENDER ? (
                                    "Continue Defending"
                                ) : (
                                    "Continue Attacking"
                                )}
                            </button>
                        </div>
                    )}
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