import { render } from "solid-js/web";
import { createSignal, onCleanup, onMount, Show, For } from "solid-js";
import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { getSceneModule } from "./createScene";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import "./index.css";
import { getCurrentPlayerInfo, checkRoomExists, getAllPlayersInRoom, getCurrentPlayerName, listenToPlayers, assignRole, type RoomPlayer } from "./scenes/missileCommand/colyseus";
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

function LoadingButton(props: { class?: string; onClick?: () => void; disabled?: boolean; isLoading?: boolean; children: any }) {
    return (
        <button class={props.class || "btn"} onClick={props.onClick} disabled={props.disabled}>
            <Show when={props.isLoading} fallback={props.children}>
                <>
                    <span class="loading loading-spinner loading-md"></span>
                    Loading...
                </>
            </Show>
        </button>
    );
}

function InstructionImage(props: { role: PlayerRole; maxH?: string; alt?: string }) {
    const src = () => props.role === PlayerRole.DEFENDER ? "/defender_instruction.png" : "/attack_instruction.png";
    const maxH = props.maxH || "max-h-[50vh]";
    const alt = props.alt || (props.role === PlayerRole.DEFENDER ? "Defender instructions" : "Attacker instructions");
    return (
        <img src={src()} alt={alt} class={`mx-auto ${maxH} rounded shadow-xl`} />
    );
}

function SectionHeader() {
    return (
        <div class="space-y-4">
            <h1 class="text-6xl font-bold text-white mb-4">Missile Command</h1>
            <p class="text-xl text-gray-300 opacity-75">Defend your cities from incoming missiles!</p>
        </div>
    );
}

function CheckingRoom() {
    return (
        <div class="flex items-center justify-center space-x-2">
            <span class="loading loading-spinner loading-md"></span>
            <span class="text-gray-300">Checking room...</span>
        </div>
    );
}

function RoleSelection(props: { isLoading: boolean; onSelect: (role: PlayerRole) => void }) {
    return (
        <div class="text-center space-y-6">
            <div class="text-xl text-yellow-400 font-semibold">Choose Your Role</div>
            <p class="text-gray-300 opacity-75">This room already has players. Choose which role you want to play:</p>
            <div class="flex gap-4 justify-center">
                <div class="space-y-4">
                    <InstructionImage role={PlayerRole.DEFENDER} maxH="max-h-[30vh]" />
                    <LoadingButton
                        class="btn btn-primary btn-lg text-lg px-8 py-4"
                        onClick={() => props.onSelect(PlayerRole.DEFENDER)}
                        disabled={props.isLoading}
                        isLoading={props.isLoading}
                    >
                        Play as Defender
                    </LoadingButton>
                </div>
                <div class="space-y-4">
                    <InstructionImage role={PlayerRole.ATTACKER} maxH="max-h-[30vh]" />
                    <LoadingButton
                        class="btn btn-secondary btn-lg text-lg px-8 py-4"
                        onClick={() => props.onSelect(PlayerRole.ATTACKER)}
                        disabled={props.isLoading}
                        isLoading={props.isLoading}
                    >
                        Play as Attacker
                    </LoadingButton>
                </div>
            </div>
        </div>
    );
}

function StartDefenderSection(props: { isLoading: boolean; onStart: () => void }) {
    return (
        <div class="space-y-6">
            <InstructionImage role={PlayerRole.DEFENDER} />
            <LoadingButton
                class="btn btn-primary btn-lg text-lg px-8 py-4"
                onClick={props.onStart}
                disabled={props.isLoading}
                isLoading={props.isLoading}
            >
                Start Game
            </LoadingButton>
        </div>
    );
}

function StartAttackerSection(props: { isLoading: boolean; onStart: () => void }) {
    return (
        <div class="space-y-6">
            <InstructionImage role={PlayerRole.ATTACKER} />
            <LoadingButton
                class="btn btn-secondary btn-lg text-lg px-8 py-4"
                onClick={props.onStart}
                disabled={props.isLoading}
                isLoading={props.isLoading}
            >
                Start Game
            </LoadingButton>
        </div>
    );
}

function ContinueGameSection(props: { isLoading: boolean; role: PlayerRole | null; onContinue: () => void }) {
    return (
        <div class="space-y-6">
            <InstructionImage role={props.role === PlayerRole.ATTACKER ? PlayerRole.ATTACKER : PlayerRole.DEFENDER} />
            <LoadingButton
                class="btn btn-secondary btn-lg text-lg px-8 py-4"
                onClick={props.onContinue}
                disabled={props.isLoading}
                isLoading={props.isLoading}
            >
                {props.role === PlayerRole.DEFENDER ? "Continue Defending" : "Continue Attacking"}
            </LoadingButton>
        </div>
    );
}

function GameOverOverlay(props: { score: number; reason?: string; onRestart: () => void }) {
    return (
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div class="bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl text-center space-y-6 max-w-sm w-full mx-4">
                <h2 class="text-3xl font-bold text-white">Game Over</h2>
                <div class="text-gray-300">
                    <div class="text-lg">Score: <span class="font-semibold text-white">{props.score}</span></div>
                    <Show when={props.reason}>
                        <div class="text-sm opacity-75 mt-1">Reason: {props.reason}</div>
                    </Show>
                </div>
                <div class="flex gap-3 justify-center">
                    <button class="btn btn-primary" onClick={props.onRestart}>Restart</button>
                </div>
            </div>
        </div>
    );
}

function PlayerNameBadge(props: { name?: string | null }) {
    return (
        <Show when={props.name}>
            <div class="absolute top-3 left-3 text-sm text-white bg-black/40 rounded px-2 py-1">
                {props.name}
            </div>
        </Show>
    );
}

function App() {
    const [gameStarted, setGameStarted] = createSignal(false);
    const [isLoading, setIsLoading] = createSignal(false);
    const [isGameOver, setIsGameOver] = createSignal(false);
    const [finalScore, setFinalScore] = createSignal(0);
    const [gameOverReason, setGameOverReason] = createSignal<string | undefined>(undefined);
    const [playerRole, setPlayerRole] = createSignal<PlayerRole | null>(null);
    const [showStartGame, setShowStartGame] = createSignal(true);
    const [showStartAttacker, setShowStartAttacker] = createSignal(false);
    const [playerName, setPlayerName] = createSignal<string | null>(null);
    const [players, setPlayers] = createSignal<RoomPlayer[]>([]);
    let disposePlayers: (() => void) | null = null;
    const [isCheckingHash, setIsCheckingHash] = createSignal(true);

    const checkHashAndPlayer = async () => {
        setIsCheckingHash(true);
        
        try {
            // Single-room server: always check the one room
            const roomExists = await checkRoomExists();
            if (roomExists) {
                const allPlayers = await getAllPlayersInRoom();
                const currentPlayerInfo = await getCurrentPlayerInfo();
                if (currentPlayerInfo?.role && currentPlayerInfo.role !== PlayerRole.UNASSIGNED) {
                    setPlayerRole(currentPlayerInfo.role);
                    setPlayerName(await getCurrentPlayerName());
                    setShowStartGame(false);
                    setShowStartAttacker(false);
                } else {
                    if (allPlayers.length === 0) {
                        setShowStartGame(true);
                        setShowStartAttacker(false);
                    } else if (allPlayers.length === 1) {
                        // Show attacker start when there is exactly one player (the defender) in the room
                        setShowStartGame(false);
                        setShowStartAttacker(true);
                    } else {
                        setShowStartGame(false);
                        setShowStartAttacker(false);
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
            await assignRole(PlayerRole.DEFENDER);
            setPlayerName(await getCurrentPlayerName());

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

    const startAttacker = async () => {
        setIsLoading(true);
        setGameStarted(true);
        setIsGameOver(false);
        setFinalScore(0);
        setGameOverReason(undefined);

        try {
            // Register this client as Attacker in Firebase for this room
            await assignRole(PlayerRole.ATTACKER);
            setPlayerName(await getCurrentPlayerName());

            const container = document.getElementById("game-container");
            if (container) {
                await babylonInit(container, PlayerRole.ATTACKER);
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
            // Inform the server of the chosen role
            await assignRole(role);
            // Register the player with the selected role
            setPlayerRole(role);
            setPlayerName(await getCurrentPlayerName());
            
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
        // subscribe to players list
        listenToPlayers((ps) => setPlayers(ps)).then((dispose) => { disposePlayers = dispose; }).catch(() => {});
        checkHashAndPlayer();
    });

    onCleanup(() => {
        window.removeEventListener("gameover", handleGameOver as EventListener);
        if (disposePlayers) try { disposePlayers(); } catch (_e) {}
    });

    const restart = () => {
        // simplest: reload to reset scene and state
        location.reload();
    };

    return (
        <div class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
            {!gameStarted() ? (
                <div class="text-center space-y-8">
                    <div class="max-w-2xl mx-auto">
                        <PlayersTables players={players()} currentName={playerName() || undefined} />
                    </div>
                    <SectionHeader />
                    {isCheckingHash() ? (
                        <CheckingRoom />
                    ) : !showStartGame() && !showStartAttacker() && !playerRole() ? (
                        <RoleSelection isLoading={isLoading()} onSelect={selectRole} />
                    ) : showStartGame() ? (
                        <StartDefenderSection isLoading={isLoading()} onStart={startGame} />
                    ) : showStartAttacker() ? (
                        <StartAttackerSection isLoading={isLoading()} onStart={startAttacker} />
                    ) : (
                        <ContinueGameSection isLoading={isLoading()} role={playerRole()} onContinue={continueGame} />
                    )}
                </div>
            ) : (
                <div class="relative w-full h-full flex items-center justify-center">
                    <PlayerNameBadge name={playerName()} />
                    <div class="absolute top-3 right-3 max-w-sm">
                        <PlayersTables players={players()} small currentName={playerName() || undefined} />
                    </div>
                    <div id="game-container" class="w-full h-full flex items-center justify-center" />
                    <Show when={isGameOver()}>
                        <GameOverOverlay score={finalScore()} reason={gameOverReason()} onRestart={restart} />
                    </Show>
                </div>
            )}
        </div>
    );
}

function PlayersTables(props: { players: RoomPlayer[]; small?: boolean; currentName?: string }) {
    const defenders = () => props.players.filter(p => p.role === PlayerRole.DEFENDER);
    const attackers = () => props.players.filter(p => p.role === PlayerRole.ATTACKER);
    const tableCls = props.small ? "table table-xs" : "table table-sm";
    const wrapCls = props.small ? "bg-black/40 rounded p-2 text-white" : "bg-black/40 rounded p-4 text-white";
    return (
        <div class={wrapCls}>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <div class="font-semibold text-yellow-300 mb-1">Defenders</div>
                    <table class={tableCls}>
                        <thead>
                            <tr><th>Name</th><th class="text-right">Score</th></tr>
                        </thead>
                        <tbody>
                            <For each={defenders()}>{(p) => (
                                <tr>
                                    <td class={"pr-4 truncate max-w-[12rem]" + ((props.currentName && (p.name || p.id) === props.currentName) ? " font-bold" : "")}>{p.name || p.id}</td>
                                    <td class={"text-right" + ((props.currentName && (p.name || p.id) === props.currentName) ? " font-bold" : "")}>{p.score}</td>
                                </tr>
                            )}</For>
                            <Show when={defenders().length === 0}>
                                <tr><td colspan="2" class="opacity-70">None</td></tr>
                            </Show>
                        </tbody>
                    </table>
                </div>
                <div>
                    <div class="font-semibold text-pink-300 mb-1">Attackers</div>
                    <table class={tableCls}>
                        <thead>
                            <tr><th>Name</th><th class="text-right">Score</th></tr>
                        </thead>
                        <tbody>
                            <For each={attackers()}>{(p) => (
                                <tr>
                                    <td class={"pr-4 truncate max-w-[12rem]" + ((props.currentName && (p.name || p.id) === props.currentName) ? " font-bold" : "")}>{p.name || p.id}</td>
                                    <td class={"text-right" + ((props.currentName && (p.name || p.id) === props.currentName) ? " font-bold" : "")}>{p.score}</td>
                                </tr>
                            )}</For>
                            <Show when={attackers().length === 0}>
                                <tr><td colspan="2" class="opacity-70">None</td></tr>
                            </Show>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Initialize the SolidJS app
render(() => <App />, document.getElementById("app")!);