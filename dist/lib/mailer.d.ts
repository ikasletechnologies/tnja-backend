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
export {};
//# sourceMappingURL=mailer.d.ts.map