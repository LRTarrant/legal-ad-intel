import type { TenantBranding } from "../tenant-config";
import { DEFAULT_LMI_BRANDING } from "../tenant-config";

interface InviteEmailParams {
  inviterName: string;
  token: string;
  branding: TenantBranding;
  appUrl: string;
}

export function buildInviteEmailHtml({
  inviterName,
  token,
  branding,
  appUrl,
}: InviteEmailParams): string {
  const productName =
    branding.productName ?? DEFAULT_LMI_BRANDING.productName ?? "Legal Marketing Intelligence";
  const accentColor = branding.accentColor ?? "#1A8C96";
  const logoUrl = branding.logoUrl
    ? branding.logoUrl.startsWith("http")
      ? branding.logoUrl
      : `${appUrl}${branding.logoUrl}`
    : `${appUrl}/logo-horizontal.svg`;
  const acceptUrl = `${appUrl}/invite/${token}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Inter,Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <!-- Logo -->
        <tr>
          <td align="center" style="padding:32px 40px 24px;">
            <img src="${logoUrl}" alt="${productName}" width="180" style="display:block;max-width:180px;height:auto;" />
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding:0 40px 32px;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1e1e2e;text-align:center;">
              You&rsquo;ve been invited to join ${productName}
            </h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#52525b;text-align:center;">
              ${inviterName} has invited you to access <strong>${productName}</strong>.
              Click the button below to create your account. This invitation expires in 7 days.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${acceptUrl}" target="_blank" style="display:inline-block;padding:12px 32px;background-color:${accentColor};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                  Accept Invitation
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #e4e4e7;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;text-align:center;">
              If you didn&rsquo;t expect this invitation, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
