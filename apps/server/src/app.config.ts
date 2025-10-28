import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import { auth } from "@colyseus/auth";
import path from 'path';
import serveIndex from 'serve-index';
import express from 'express';

// import { uWebSocketsTransport} from "@colyseus/uwebsockets-transport";
import "./config/auth";

// Import demo room handlers
import { LobbyRoom, RelayRoom } from 'colyseus';
import { ChatRoom } from "./rooms/01-chat-room";
import { StateHandlerRoom } from "./rooms/02-state-handler";
import { AuthRoom } from "./rooms/03-auth";
import { ReconnectionRoom } from './rooms/04-reconnection';
import { CustomLobbyRoom } from './rooms/07-custom-lobby-room';
import { GameRoom } from "./rooms/GameRoom";

export default config({
    options: {
        devMode: true,
    },

    initializeGameServer: (gameServer) => {
        gameServer.define("room", GameRoom)
            .enableRealtimeListing();

        gameServer.onShutdown(function(){
            console.log(`game server is going down.`);
        });


    },

    initializeExpress: (app) => {
        // (optional) client playground
        app.use('/playground', playground());

        // (optional) web monitoring panel
        app.use('/colyseus', monitor());

        app.use('/', serveIndex(path.join(__dirname, "static"), {'icons': true}))
        app.use('/', express.static(path.join(__dirname, "static")));
    },


    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */
    }
});
