import { createServer } from "node:http";
import { Server } from "socket.io";

let chatCount = 0;
const sessionEvents = [];
const http = createServer((request, response) => {
    if (request.url === "/stats") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ chatCount, sessionEvents }));
        return;
    }
    if (request.url === "/disconnect" && request.method === "POST") {
        resumeConnectionsAt = Date.now() + 800;
        io.sockets.sockets.forEach((socket) => socket.conn.close());
        response.writeHead(200);
        response.end("ok");
        return;
    }
    response.writeHead(request.url === "/health" ? 200 : 404);
    response.end(request.url === "/health" ? "ok" : "Not found");
});
let resumeConnectionsAt = 0;
const io = new Server(http, {
    cors: { origin: "http://127.0.0.1:4180" },
    allowRequest: (_request, accept) => setTimeout(() => accept(null, true), Math.max(0, resumeConnectionsAt - Date.now())),
});
io.on("connection", (socket) => {
    const record = (type, data) => {
        if (socket.data.sessionFixture) sessionEvents.push({ type, socket: socket.id, ...data });
    };
    socket.on("authenticate", (token) => {
        const { data } = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
        socket.data.sessionFixture = data.property_code === "session-fixture";
        record("authenticate", { x_auth_token: data.x_auth_token });
        socket.emit("success");
        if (data.property_code !== "no-greeting") socket.emit("response", "Welcome to **group_name**. How can we help with your stay?");
    });
    socket.on("login", (payload) => record("login", JSON.parse(payload)));
    socket.on("logout", (payload) => {
        record("logout", JSON.parse(payload));
        socket.emit("logout", "Old logout acknowledgement");
        socket.emit("response", "Late reply from the signed-in session");
    });
    socket.on("chat", (payload) => {
        chatCount++;
        const { input, x_auth_token } = JSON.parse(payload);
        record("chat", { input, x_auth_token });
        if (input.startsWith("Fixture error ")) {
            const code = input.slice("Fixture error ".length);
            socket.emit("error", code);
            socket.emit("error", code);
        } else if (input.startsWith("Fixture severe ")) {
            const code = input.slice("Fixture severe ".length);
            socket.emit("severe", code);
            socket.emit("severe", code);
        } else if (input === "Repeat answer") {
            socket.emit("response", "The same answer.");
            socket.emit("response", "The same answer.");
        } else if (input === "Error sequence") {
            socket.emit("error", "user_info");
            socket.emit("error", "missing_parameters");
            socket.emit("error", "user_info");
        } else if (input === "Expire session") {
            socket.emit("expired");
        } else if (input === "Reconnect briefly") {
            resumeConnectionsAt = Date.now() + 3000;
            socket.conn.close();
        } else if (input === "Long answer") {
            socket.emit("response", Array.from({ length: 30 }, (_, index) => `Stay detail ${index + 1}: Your guest assistant can help with rooms, reservations, and hotel amenities.`).join("\n\n") + "\n\nThe last detail of your stay.");
        } else if (input === "Show an error") {
            socket.emit("error", "We couldn't answer that question. Please try again.");
        } else {
            setTimeout(() => socket.emit("response", `You asked: **${input}**.\n\n| Room | Rate |\n| --- | --- |\n| Deluxe | 120 |\n\n[Book a room](http://127.0.0.1:4180/tests/fixtures/booking.html)`), input === "Take your time" ? 1200 : 350);
        }
    });
});
http.listen(4181, "127.0.0.1");
