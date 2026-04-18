interface AlertEmailParams {
  alertName: string;
  tortName: string;
  stateName: string;
  advertiserName: string;
  firstSeen: string;
  platform: string;
  adCount: number;
  dashboardUrl: string;
}

export function buildAlertEmailHtml({
  alertName,
  tortName,
  stateName,
  advertiserName,
  firstSeen,
  platform,
  adCount,
  dashboardUrl,
}: AlertEmailParams): string {
  const accentColor = "#1A8C96";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Inter,Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:32px 40px 24px;">
            <img src="${dashboardUrl}/logo-horizontal.svg" alt="Legal Marketing Intelligence" width="180" style="display:block;max-width:180px;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e1e2e;text-align:center;">
              New Competitor Alert
            </h1>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;text-align:center;">
              ${alertName}
            </p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#52525b;">
              We&rsquo;ve detected a new advertiser for <strong>${tortName}</strong> in <strong>${stateName}</strong>:
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:6px;padding:16px;margin-bottom:24px;">
              <tr><td style="padding:8px 16px;font-size:14px;color:#6b7280;">Advertiser</td><td style="padding:8px 16px;font-size:14px;font-weight:600;color:#1e1e2e;">${advertiserName}</td></tr>
              <tr><td style="padding:8px 16px;font-size:14px;color:#6b7280;">First Seen</td><td style="padding:8px 16px;font-size:14px;color:#1e1e2e;">${firstSeen}</td></tr>
              <tr><td style="padding:8px 16px;font-size:14px;color:#6b7280;">Platform</td><td style="padding:8px 16px;font-size:14px;color:#1e1e2e;">${platform}</td></tr>
              <tr><td style="padding:8px 16px;font-size:14px;color:#6b7280;">Estimated Ad Count</td><td style="padding:8px 16px;font-size:14px;color:#1e1e2e;">${adCount}</td></tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${dashboardUrl}/alerts" target="_blank" style="display:inline-block;padding:12px 32px;background-color:${accentColor};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                  View details in your LMI dashboard &rarr;
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">
              Legal Marketing Intelligence<br/>
              You&rsquo;re receiving this because you set up a competitor alert.<br/>
              <a href="${dashboardUrl}/alerts" style="color:${accentColor};text-decoration:underline;">Manage your alerts</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
