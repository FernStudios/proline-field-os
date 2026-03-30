// Client-side email helper — calls /api/send-email

const BASE = window.location.origin

export async function sendPortalLink({ customerEmail, customerName, portalToken, jobAddress, jobType, companyName, companyPhone }) {
  const portalUrl = `${BASE}/portal/${portalToken}`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <div style="border-bottom:3px solid #050d1f;padding-bottom:16px;margin-bottom:24px">
        <h2 style="color:#050d1f;margin:0;font-size:20px">${companyName || 'Your Contractor'}</h2>
        ${companyPhone ? `<p style="color:#666;margin:4px 0;font-size:14px">${companyPhone}</p>` : ''}
      </div>
      <p style="font-size:16px;color:#111">Hi ${customerName || 'there'},</p>
      <p style="color:#444;line-height:1.6">
        Your project portal is ready. You can view your estimate, contract, project status, and account balance at any time using the secure link below.
      </p>
      ${jobAddress ? `<p style="color:#666;font-size:14px"><strong>Project:</strong> ${jobAddress}${jobType ? ` — ${jobType}` : ''}</p>` : ''}
      <div style="text-align:center;margin:32px 0">
        <a href="${portalUrl}" style="background:#050d1f;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">
          View Your Project Portal →
        </a>
      </div>
      <p style="color:#666;font-size:13px">
        Or copy this link: <a href="${portalUrl}" style="color:#0a3ef8">${portalUrl}</a>
      </p>
      <p style="color:#666;font-size:13px">
        This link is unique to your project and will remain active throughout the life of your job. 
        No account or password required.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px;text-align:center">
        ${companyName || 'Your Contractor'} · Powered by Proline Field OS
      </p>
    </div>
  `

  return callEmailAPI({
    to: customerEmail,
    toName: customerName,
    subject: `Your project portal — ${jobAddress || companyName || 'Project update'}`,
    html,
    fromName: companyName,
  })
}

export async function sendInviteEmail({ toEmail, toName, role, companyName, invitedByName, inviteLink }) {
  const roleLabels = { owner: 'Owner', office: 'Office', foreman: 'Foreman', crew: 'Crew Member' }
  const roleLabel = roleLabels[role] || role

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <div style="border-bottom:3px solid #050d1f;padding-bottom:16px;margin-bottom:24px">
        <h2 style="color:#050d1f;margin:0;font-size:20px">Proline Field OS</h2>
        <p style="color:#666;margin:4px 0;font-size:14px">Job management for residential contractors</p>
      </div>
      <p style="font-size:16px;color:#111">Hi ${toName || 'there'},</p>
      <p style="color:#444;line-height:1.6">
        <strong>${invitedByName || 'Your company'}</strong> has invited you to join <strong>${companyName || 'their account'}</strong> on Proline Field OS as a <strong>${roleLabel}</strong>.
      </p>
      <p style="color:#444;line-height:1.6">
        Proline Field OS is the job management system for ${companyName || 'your company'}. 
        You'll use it to view jobs, schedules, and project documents.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${inviteLink || BASE}" style="background:#050d1f;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">
          Accept Invitation →
        </a>
      </div>
      ${inviteLink ? `<p style="color:#666;font-size:13px">Or copy: <a href="${inviteLink}" style="color:#0a3ef8">${inviteLink}</a></p>` : ''}
      <p style="color:#888;font-size:13px">This invitation was sent by ${invitedByName || 'your account owner'}. If you weren't expecting this, you can ignore this email.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px;text-align:center">Proline Field OS · prolinefieldos.com</p>
    </div>
  `

  return callEmailAPI({
    to: toEmail,
    toName,
    subject: `You've been invited to join ${companyName || 'a company'} on Proline Field OS`,
    html,
    fromName: companyName || 'Proline Field OS',
  })
}

async function callEmailAPI({ to, toName, subject, html, fromName, fromEmail }) {
  try {
    const resp = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, toName, subject, html, fromName, fromEmail }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error || 'Email send failed')
    return { success: true, data }
  } catch (e) {
    console.error('sendEmail error:', e.message)
    return { success: false, error: e.message }
  }
}
