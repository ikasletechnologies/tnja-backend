import "dotenv/config";
import { sendApprovalEmail } from "../src/lib/mailer.js";

async function testMail() {
  try {
    console.log("Attempting to send test email...");
    await sendApprovalEmail({
      toEmail: "manikandandev2214@gmail.com", // I'll use a common test email or the user's email if I knew it.
      toName: "Test User",
      tempId: "TEMP123",
      permanentId: "TNJA-STU-0001",
      password: "TestPassword123",
      role: "Student"
    });
    console.log("Test email sent successfully!");
  } catch (error) {
    console.error("Test email failed:", error);
  }
}

testMail();
