
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

const apiKey = (process.env.SENDGRID_API_KEY || "").replace(/['"]/g, "").trim();
const fromEmail = (process.env.EMAIL_FROM || "").replace(/['"]/g, "").trim();

sgMail.setApiKey(apiKey);

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  try {
    const response = await sgMail.send({
      to,
      from: fromEmail,
      subject,
      html,
    });
    console.log(`Email sent successfully to ${to}. SendGrid Response:`, response[0].statusCode);
  } catch (error: any) {
    console.error(`Failed to send email to ${to}:`, error.response?.body || error.message);
    throw error;
  }
};
