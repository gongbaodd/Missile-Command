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
import { GameRoom } from "./rooms/GameRoom";

export default config({
    options: {
        devMode: true,
    },

    initializeGameServer: (gameServer) => {
        gameServer.define("missile_command", GameRoom)
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
