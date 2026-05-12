import { createRequire } from "module";
const require = createRequire(import.meta.url);
const nodemailer = require("nodemailer");

// SMTP config mirrored from plugin/plugin/mail.php
const SMTP_HOST     = process.env.SMTP_HOST     || "smtp.gmail.com";
const SMTP_PORT     = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER     = process.env.SMTP_USER     || "ikasletechnologyservices@gmail.com";
const SMTP_PASS     = process.env.SMTP_PASS     || "ocup ccca mhev hksb";
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "Tamil Nadu Judo Association";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // STARTTLS
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

interface ApprovalMailOptions {
  toEmail: string;
  toName: string;
  tempId: string;
  permanentId: string;
  password: string;        // raw (un-hashed) password
  role: "Student" | "Coach" | "Member" | "Club";
}

export async function sendApprovalEmail(opts: ApprovalMailOptions) {
  const { toEmail, toName, tempId, permanentId, password, role } = opts;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
    body { margin:0; font-family:'Roboto',sans-serif; background:#1e3a8a; color:#333; }
    .wrapper { padding: 40px 20px; }
    .container { max-width:600px; margin:auto; background:#fff; border-radius:16px;
                 box-shadow:0 8px 32px rgba(0,0,0,0.18); overflow:hidden; }
    .header { background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);
              padding:36px 40px; text-align:center; }
    .header img { max-width:80px; margin-bottom:12px; }
    .header h1 { color:#fff; margin:0; font-size:22px; letter-spacing:1px; }
    .header p  { color:#bfdbfe; margin:6px 0 0; font-size:14px; }
    .body { padding:36px 40px; }
    .body h2 { color:#1e3a8a; font-size:20px; margin-top:0; }
    .body p  { color:#475569; line-height:1.7; }
    .credentials { background:#f0f9ff; border:1px solid #bae6fd; border-radius:12px;
                   padding:20px 24px; margin:24px 0; }
    .credentials table { width:100%; border-collapse:collapse; }
    .credentials td { padding:10px 0; border-bottom:1px solid #e0f2fe; font-size:15px; }
    .credentials td:first-child { font-weight:700; color:#1e3a8a; width:45%; }
    .credentials tr:last-child td { border-bottom:none; }
    .badge { display:inline-block; background:#dcfce7; color:#16a34a;
             border-radius:999px; padding:4px 16px; font-weight:700; font-size:13px; }
    .footer { background:#f8fafc; padding:20px 40px; text-align:center;
              border-top:1px solid #e2e8f0; color:#94a3b8; font-size:12px; }
    .warning { background:#fef9c3; border:1px solid #fde68a; border-radius:8px;
               padding:12px 16px; color:#92400e; font-size:13px; margin-top:16px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Tamil Nadu Judo Association</h1>
        <p>Official Registration Portal</p>
      </div>
      <div class="body">
        <h2>🎉 Your Application is Approved!</h2>
        <p>Dear <strong>${toName}</strong>,</p>
        <p>We are pleased to inform you that your <strong>${role}</strong> application has been reviewed and <span class="badge">APPROVED</span> by the TNJA Super Admin.</p>
        <p>Your permanent membership credentials are below. Please use them to log in to the TNJA portal:</p>
        <div class="credentials">
          <table>
            <tr>
              <td>Temporary ID</td>
              <td>${tempId}</td>
            </tr>
            <tr>
              <td>Permanent ID</td>
              <td><strong>${permanentId}</strong></td>
            </tr>
            <tr>
              <td>Password</td>
              <td><strong>${password}</strong></td>
            </tr>
            <tr>
              <td>Role</td>
              <td>${role}</td>
            </tr>
          </table>
        </div>
        <div class="warning">
          ⚠️ Please change your password after your first login for security purposes.
        </div>
        <p style="margin-top:24px;">Welcome to the Tamil Nadu Judo Association family!</p>
        <p>Regards,<br/><strong>TNJA Admin Team</strong></p>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Tamil Nadu Judo Association. All rights reserved.<br/>
        This is an automated email. Please do not reply directly to this message.
      </div>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
    to: `"${toName}" <${toEmail}>`,
    subject: `TNJA Application Approved – Your Login Credentials`,
    html,
  });

  console.log(`[Mailer] Approval email sent to ${toEmail} (${role})`);
}

export async function sendRejectionEmail(opts: {
  toEmail: string;
  toName: string;
  role: string;
  remark: string;
}) {
  const { toEmail, toName, role, remark } = opts;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
    body { margin:0; font-family:'Roboto',sans-serif; background:#7f1d1d; color:#333; }
    .wrapper { padding: 40px 20px; }
    .container { max-width:600px; margin:auto; background:#fff; border-radius:16px; overflow:hidden;
                 box-shadow:0 8px 32px rgba(0,0,0,0.18); }
    .header { background:linear-gradient(135deg,#7f1d1d 0%,#dc2626 100%);
              padding:36px 40px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:22px; }
    .header p  { color:#fecaca; margin:6px 0 0; font-size:14px; }
    .body { padding:36px 40px; }
    .body h2 { color:#dc2626; margin-top:0; }
    .body p  { color:#475569; line-height:1.7; }
    .remark { background:#fef2f2; border:1px solid #fecaca; border-radius:12px;
              padding:16px 20px; color:#7f1d1d; margin:20px 0; }
    .footer { background:#f8fafc; padding:20px 40px; text-align:center;
              border-top:1px solid #e2e8f0; color:#94a3b8; font-size:12px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Tamil Nadu Judo Association</h1>
        <p>Official Registration Portal</p>
      </div>
      <div class="body">
        <h2>Application Status Update</h2>
        <p>Dear <strong>${toName}</strong>,</p>
        <p>After careful review, your <strong>${role}</strong> application has been <strong>rejected</strong> by the TNJA Admin.</p>
        <div class="remark">
          <strong>Reason:</strong><br/>${remark}
        </div>
        <p>If you believe this is an error or would like to re-apply, please contact the TNJA office.</p>
        <p>Regards,<br/><strong>TNJA Admin Team</strong></p>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Tamil Nadu Judo Association. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
    to: `"${toName}" <${toEmail}>`,
    subject: `TNJA Application Status – Action Required`,
    html,
  });

  console.log(`[Mailer] Rejection email sent to ${toEmail} (${role})`);
}
