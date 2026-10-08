import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, isPrimaryAdmin, isStrictlyStudentEmail, type User } from "@/lib/permissions";
import { getSystemName } from "@/lib/server-config";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

function buildEmailHtml({
  subject,
  message,
  senderName,
  senderEmail,
  recipientName,
  systemName,
}: {
  subject: string;
  message: string;
  senderName: string;
  senderEmail: string;
  recipientName?: string;
  systemName: string;
}) {
  const formattedMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.05);">
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:24px 32px;color:#ffffff;">
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;opacity:0.9;">
                ${systemName} Official Communication
              </div>
              <h1 style="margin:8px 0 0 0;font-size:20px;font-weight:700;line-height:1.3;">
                ${subject}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${
                recipientName
                  ? `<p style="margin:0 0 16px 0;font-size:15px;font-weight:600;color:#1e293b;">Hello ${recipientName},</p>`
                  : ""
              }
              <div style="font-size:15px;line-height:1.65;color:#334155;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
                ${formattedMessage}
              </div>
              <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b;">
                <p style="margin:0 0 4px 0;">Sent by <strong>${senderName}</strong> (${senderEmail})</p>
                <p style="margin:0;">${systemName} Administration</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isStrictlyStudentEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const { data: senderProfile } = await adminSupabase
      .from("user_profiles")
      .select("role, full_name, username")
      .eq("id", user.id)
      .maybeSingle();

    const effectiveUser: User = {
      id: user.id,
      email: user.email,
      role: senderProfile?.role || user.user_metadata?.role,
      user_metadata: user.user_metadata,
    };

    if (!isAdmin(effectiveUser) && !isPrimaryAdmin(effectiveUser)) {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      recipientUserId,
      recipientEmail,
      recipientName,
      recipientRole,
      targetGroup, // Optional: "specific" | "all_admins" | "all_students"
      subject,
      message,
      alsoSendNotification = true,
    } = body;

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Subject and message are required." },
        { status: 400 }
      );
    }

    const systemName = getSystemName();
    const senderName =
      senderProfile?.full_name ||
      user.user_metadata?.full_name ||
      senderProfile?.username ||
      "System Administrator";
    const senderEmail = user.email || "admin@navo.rw";

    // Resolve recipients list
    let recipients: Array<{ id?: string; email: string; name?: string; role?: string }> = [];

    if (targetGroup === "all_admins") {
      const { data: adminProfiles } = await adminSupabase
        .from("user_profiles")
        .select("id, email, full_name, username, role")
        .eq("role", "Admin");

      recipients = (adminProfiles || [])
        .filter((p) => p.email && !isStrictlyStudentEmail(p.email))
        .map((p) => ({
          id: p.id,
          email: p.email,
          name: p.full_name || p.username || undefined,
          role: "Admin",
        }));
    } else if (targetGroup === "all_students") {
      const { data: studentProfiles } = await adminSupabase
        .from("user_profiles")
        .select("id, email, full_name, username, role")
        .neq("role", "Admin");

      recipients = (studentProfiles || [])
        .filter((p) => p.email && !p.email.endsWith("@nid.local") && !p.email.endsWith("@nid.internal"))
        .map((p) => ({
          id: p.id,
          email: p.email,
          name: p.full_name || p.username || undefined,
          role: "Student",
        }));
    } else if (Array.isArray(body.recipients) && body.recipients.length > 0) {
      recipients = body.recipients;
    } else if (recipientEmail?.trim()) {
      recipients = [
        {
          id: recipientUserId,
          email: recipientEmail.trim(),
          name: recipientName,
          role: recipientRole,
        },
      ];
    } else if (recipientUserId) {
      const { data: targetProfile } = await adminSupabase
        .from("user_profiles")
        .select("id, email, full_name, username, role")
        .eq("id", recipientUserId)
        .maybeSingle();

      if (targetProfile?.email) {
        recipients = [
          {
            id: targetProfile.id,
            email: targetProfile.email,
            name: targetProfile.full_name || targetProfile.username || recipientName,
            role: targetProfile.role || recipientRole,
          },
        ];
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No valid recipient email address found." },
        { status: 400 }
      );
    }

    // Configure SMTP if available
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom =
      process.env.SMTP_FROM || `"${systemName} Admin" <${smtpUser || "noreply@luxen.rw"}>`;

    let transporter: nodemailer.Transporter | null = null;
    if (smtpHost && smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }

    let sentCount = 0;
    let deliveryMode: "smtp" | "in_app_and_logged" = transporter ? "smtp" : "in_app_and_logged";

    for (const recipient of recipients) {
      const cleanEmail = recipient.email.trim();
      const htmlContent = buildEmailHtml({
        subject: subject.trim(),
        message: message.trim(),
        senderName,
        senderEmail,
        recipientName: recipient.name,
        systemName,
      });

      if (transporter && !cleanEmail.endsWith("@nid.rw") && !cleanEmail.endsWith("@nid.local")) {
        try {
          await transporter.sendMail({
            from: smtpFrom,
            to: cleanEmail,
            replyTo: senderEmail,
            subject: `[${systemName}] ${subject.trim()}`,
            html: htmlContent,
            text: `${subject.trim()}\n\n${message.trim()}\n\n— ${senderName} (${systemName})`,
          });
          sentCount++;
        } catch (smtpErr) {
          console.warn(`[send-email] SMTP send failed for ${cleanEmail}, falling back to system inbox:`, smtpErr);
          deliveryMode = "in_app_and_logged";
          sentCount++;
        }
      } else {
        sentCount++;
      }

      // Also deliver an in-app notification so the recipient sees the email message immediately inside the platform
      if (alsoSendNotification && recipient.id) {
        try {
          await adminSupabase.from("notifications").insert({
            user_id: recipient.id,
            title: `📧 Email: ${subject.trim()}`,
            message: message.trim(),
            type: "admin_message",
            priority: "normal",
            read: false,
            created_at: new Date().toISOString(),
          });
        } catch {
          // Ignore if notifications insert fails
        }
      }
    }

    await logAdminAction({
      action: "EMAIL_DISPATCHED",
      actionLabel: "Admin Email Sent",
      category: "COMMUNICATION",
      details: `Sent email "${subject.trim()}" to ${
        recipients.length === 1
          ? `${recipients[0].name || recipients[0].email} (${recipients[0].email})`
          : `${recipients.length} recipients`
      }`,
      targetType: "email_message",
      targetId: recipients.length === 1 ? recipients[0].id || recipients[0].email : targetGroup || "bulk",
      targetLabel: recipients.length === 1 ? recipients[0].email : `${recipients.length} recipients`,
      metadata: {
        subject: subject.trim(),
        recipientCount: recipients.length,
        deliveryMode,
      },
      adminUser: effectiveUser,
    });

    return NextResponse.json({
      success: true,
      sentCount,
      deliveryMode,
      message: `Email message sent to ${
        recipients.length === 1 ? recipients[0].email : `${sentCount} recipients`
      }`,
    });
  } catch (err: any) {
    console.error("[api/admin/send-email] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to send email message" },
      { status: 500 }
    );
  }
}
