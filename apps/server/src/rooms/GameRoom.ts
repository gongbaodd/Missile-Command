import { Room, Client } from "colyseus";
import { Schema, type } from "@colyseus/schema";

class Player extends Schema {
	@type("string") id: string = "";
	@type("string") name: string = "";
	@type("number") score: number = 0;
}

class GameState extends Schema {
	@type([Player]) players: Player[] = [];
}

export class GameRoom extends Room<GameState> {
	onCreate() {
		this.setState(new GameState());

		this.onMessage("message", (client, message) => {
            console.log("ChatRoom received message from", client.sessionId, ":", message);
            this.broadcast("messages", `(${client.sessionId}) ${message}`);
        });
	}

	onJoin(client: Client, options: any) {
		const player = new Player();
		player.id = client.sessionId;
		player.name = options?.name ?? "Player";
		this.state.players.push(player);

		this.broadcast("messages", `${ client.sessionId } joined.`);
	}

	onLeave(client: Client) {
		this.state.players = this.state.players.filter(p => p.id !== client.sessionId);

		this.broadcast("messages", `${ client.sessionId } left.`);
	}

	onDispose() {
        console.log("Dispose ChatRoom");
	}
}
