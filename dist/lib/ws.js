import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import url from "url";
const clients = new Map();
export function initWebSocketServer(server) {
    const wss = new WebSocketServer({ server });
    wss.on("connection", (ws, req) => {
        const parameters = url.parse(req.url || "", true).query;
        const userId = parameters.userId;
        const role = parameters.role || "GUEST";
        if (userId) {
            clients.set(userId, { ws, role });
            console.log(`[WS] User ${userId} connected with role ${role}`);
            ws.on("close", () => {
                clients.delete(userId);
                console.log(`[WS] User ${userId} disconnected`);
            });
        }
    });
    return wss;
}
export function sendNotificationToUser(userId, data) {
    const conn = clients.get(userId);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(JSON.stringify(data));
        console.log(`[WS] Sent notification to user ${userId}:`, data);
        return true;
    }
    return false;
}
export function sendNotificationToAdmins(data) {
    const adminRoles = [
        "SUPER_ADMIN",
        "DISTRICT_PRESIDENT",
        "DISTRICT_SECRETARY",
        "ZONE_PRESIDENT",
        "ZONE_SECRETARY",
        "STATE_PRESIDENT",
        "STATE_SECRETARY",
    ];
    let count = 0;
    for (const [userId, conn] of clients.entries()) {
        if (adminRoles.includes(conn.role) && conn.ws.readyState === WebSocket.OPEN) {
            conn.ws.send(JSON.stringify(data));
            count++;
        }
    }
    console.log(`[WS] Sent notification to ${count} admins:`, data);
    return count > 0;
}
//# sourceMappingURL=ws.js.map