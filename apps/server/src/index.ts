import express from "express";
import { createServer } from "http";
import { Server } from "colyseus";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT || 2567);

const app = express();
const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });

gameServer.define("game", GameRoom);

app.get("/health", (_req, res) => res.send("ok"));

httpServer.listen(port, () => {
	console.log(`Colyseus listening on :${port}`);
});
