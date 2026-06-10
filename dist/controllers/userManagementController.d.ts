import type { Request, Response } from "express";
export declare const getPublicCoaches: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPublicMembers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllUsers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateUserProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateUserCredentials: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCoachStudents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=userManagementController.d.ts.map