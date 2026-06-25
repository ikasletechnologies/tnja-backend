interface ApprovalMailOptions {
    toEmail: string;
    toName: string;
    tempId: string;
    permanentId: string;
    password: string;
    role: "Student" | "Coach" | "Member" | "Club";
}
export declare function sendApprovalEmail(opts: ApprovalMailOptions): Promise<void>;
export declare function sendRejectionEmail(opts: {
    toEmail: string;
    toName: string;
    role: string;
    remark: string;
}): Promise<void>;
export declare function sendPaymentRequestEmail(opts: {
    toEmail: string;
    toName: string;
    tempId: string;
    password: string;
    role: "Player" | "Coach" | "Member" | "Club";
}): Promise<void>;
export declare function sendClubRegistrationEmail(opts: {
    toEmail: string;
    toName: string;
    tempId?: string;
    password?: string;
}): Promise<void>;
export declare function sendRegistrationReceiptEmail(opts: {
    toEmail: string;
    toName: string;
    role: string;
    tempId: string;
    password?: string;
}): Promise<void>;
export declare function sendResetPasswordEmail(opts: {
    toEmail: string;
    toName: string;
    resetLink: string;
}): Promise<void>;
export declare function sendEventRegistrationEmail(opts: {
    toEmail: string;
    toName: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    amountPaid: number;
    paymentId: string;
}): Promise<void>;
export declare function sendNewTournamentAnnouncement(opts: {
    toEmail: string;
    toName: string;
    tournamentTitle: string;
    tournamentDate: string;
    tournamentLevel: string;
}): Promise<void>;
export declare function sendAadhaarVerificationEmail(toEmail: string, otp: string): Promise<void>;
export declare function sendAccountDeletionEmail(opts: {
    toEmail: string;
    toName: string;
    role: string;
}): Promise<void>;
export {};
//# sourceMappingURL=mailer.d.ts.map