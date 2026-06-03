import type { Request, Response } from "express";
export declare const getPendingApplications: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateApplicationStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getApplicationDetails: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getDashboardStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createPaymentOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const verifyPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getGlobalSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateGlobalSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const promoteMember: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getLocationAnalytics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const forceCreateStudent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const forceCreateClub: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const forceCreateMember: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=adminController.d.ts.map