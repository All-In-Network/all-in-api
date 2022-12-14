const WebSocketServer = require("websocket").server;
const WebSocketClient = require("websocket").client;
const http = require("http");

const httpServerPort = process.env.HTTP_SERVER_PORT;
const httpServer = http.createServer((request, response) => {
    console.log(`${new Date()} Received request for ${request.url}`);
    response.writeHead(404);
    response.end();
});

httpServer.listen(httpServerPort, function() {
    console.log(`${new Date()} Server is listening on port ${httpServerPort}`);
});

const wsServer = new WebSocketServer({
    httpServer: httpServer,

    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    // autoAcceptConnections: false
});

const alpacaClient = new WebSocketClient();
const alpacaWssUrl = process.env.ALPACA_WSS_URL;

function alpacaSubscribe(alpacaConnection) {
    if (alpacaConnection.connected) {
        alpacaConnection.sendUTF(JSON.stringify({
            "action": "subscribe",
            "bars": ["BTC/USD"],
            "trades": ["BTC/USD"],
        }));
    }
}

function alpacaAuthenticate(alpacaConnection) {
    if (alpacaConnection.connected) {
        alpacaConnection.sendUTF(JSON.stringify({
            "action": "auth",
            "key": process.env.ALPACA_KEY,
            "secret": process.env.ALPACA_SECRET,
        }));
    }
}

let alpacaConn;

alpacaClient.on("connectFailed", (error) => {
    console.log("Connect Error: " + error.toString());
});

alpacaClient.on("connect", (alpacaConnection) => {
    console.log("WebSocket Client connected");
    alpacaConn = alpacaConnection;

    alpacaConnection.on("error", (error) => {
        console.log(`Connection error: ${error.toString()}`);
    });

    alpacaConnection.on("close", () => {
        console.log("Connection closed");
    });

    alpacaConnection.on("message", (alpacaMessage) => {
        if (alpacaMessage.type === "utf8") {
            console.log(`Received Message: ${alpacaMessage.utf8Data}`);
        }
    });

    alpacaAuthenticate(alpacaConnection);
    alpacaSubscribe(alpacaConnection);
});

alpacaClient.connect(alpacaWssUrl);

function originIsAllowed(origin) {
    return (
        process.env.CORS_ORIGINS ?
        process.env.CORS_ORIGINS.split(",").includes(origin) :
        false
    );
}

wsServer.on("request", function(request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log(`${new Date()} Connection from origin ${request.origin} rejected.`);
        return;
    }

    const clientConnection = request.accept(null, request.origin);

    console.log(`${new Date()} Connection accepted.`);

    clientConnection.on("message", function(clientMessage) {
        if (clientMessage.type === "utf8") {
            console.log(`Received Message: ${clientMessage.utf8Data}`);

            alpacaConn.on("message", (alpacaMessage) => {
                if (alpacaMessage.type === "utf8") {
                    clientConnection.sendUTF(alpacaMessage.utf8Data);
                }
            });
        }
    });

    clientConnection.on("close", function(reasonCode, description) {
        console.log(`${new Date()} Peer ${clientConnection.remoteAddress} disconnected.`);
    });
});




