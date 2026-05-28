import type { Request, Response } from "express";
export declare const createTournament: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getClubTournaments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getApprovedTournaments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTournamentRegistrations: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateRegistrationStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateTournament: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteTournament: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPlayerTournaments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createTournamentPaymentOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const verifyTournamentPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAdminTournaments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const approveTournament: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=tournamentController.d.ts.map