import { createServer } from "node:http";
import { Server } from "socket.io";

const http = createServer((request, response) => {
    response.writeHead(request.url === "/health" ? 200 : 404);
    response.end(request.url === "/health" ? "ok" : "Not found");
});
let resumeConnectionsAt = 0;
const io = new Server(http, {
    cors: { origin: "http://127.0.0.1:4180" },
    allowRequest: (_request, accept) => setTimeout(() => accept(null, true), Math.max(0, resumeConnectionsAt - Date.now())),
});
io.on("connection", (socket) => {
    socket.on("authenticate", (token) => {
        socket.emit("success");
        const { data } = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
        if (data.property_code !== "no-greeting") socket.emit("response", "Welcome to **group_name**. How can we help with your stay?");
    });
    socket.on("chat", (payload) => {
        const { input } = JSON.parse(payload);
        if (input === "Expire session") {
            socket.emit("expired");
        } else if (input === "Reconnect briefly") {
            resumeConnectionsAt = Date.now() + 3000;
            socket.conn.close();
        } else if (input === "Long answer") {
            socket.emit("response", Array.from({ length: 30 }, (_, index) => `Stay detail ${index + 1}: Your guest assistant can help with rooms, reservations, and hotel amenities.`).join("\n\n") + "\n\nThe last detail of your stay.");
        } else if (input === "Show an error") {
            socket.emit("error", "We couldn't answer that question. Please try again.");
        } else {
            setTimeout(() => socket.emit("response", `You asked: **${input}**.\n\n| Room | Rate |\n| --- | --- |\n| Deluxe | 120 |\n\n[Book a room](http://127.0.0.1:4180/tests/fixtures/booking.html)`), 350);
        }
    });
});
http.listen(4181, "127.0.0.1");
