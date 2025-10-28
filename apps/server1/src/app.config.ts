import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";

import { GameRoom } from "./rooms/GameRoom";
import { ChatRoom } from "./rooms/ChatRoom";
import { LobbyRoom, RelayRoom } from "colyseus";

export default config({
    options: {
        devMode: true,
    },

    initializeGameServer: (gameServer) => {
        // Define "lobby" room
        // gameServer.define("lobby", LobbyRoom);

        // Define "relay" room
        // gameServer.define("relay", RelayRoom, { maxClients: 4 })
        //     .enableRealtimeListing();

        gameServer.define("room", GameRoom)
            .enableRealtimeListing();

        // gameServer.define("chat", ChatRoom)
        //     .enableRealtimeListing();

        gameServer.onShutdown(function () {
            console.log(`game server is going down.`);
        });
    },

    initializeExpress: (app) => {
        app.use('/playground', playground());
        app.use('/colyseus', monitor());
    },


    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */
    }
});
