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
export {};
//# sourceMappingURL=mailer.d.ts.map