import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";

import { GameRoom } from "./rooms/GameRoom";

export default config({
    options: {
        devMode: true,
    },

    initializeGameServer: (gameServer) => {
        gameServer.define("room", GameRoom)
            .enableRealtimeListing();

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
