import type { Request, Response } from "express";
export declare const createEvent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getActiveEvents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAdminEvents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const applyForEvent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createEventPaymentOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const verifyEventPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=eventController.d.ts.map