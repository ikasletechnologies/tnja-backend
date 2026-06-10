import { Server } from "http";
import { WebSocket } from "ws";
export declare function initWebSocketServer(server: Server): import("ws").Server<typeof WebSocket, typeof import("node:http").IncomingMessage>;
export declare function sendNotificationToUser(userId: string, data: any): boolean;
export declare function sendNotificationToAdmins(data: any): boolean;
//# sourceMappingURL=ws.d.ts.map