import type { Request, Response } from "express";
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getProfile: (req: any, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const changePassword: (req: any, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const forgotPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const resetPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=authController.d.ts.map