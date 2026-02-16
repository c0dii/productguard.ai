import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ error: 'Domain required' }, { status: 400 });
    }

    // For common platforms, provide known abuse contacts
    const knownPlatforms: Record<string, { registrar: string; abuseEmail: string }> = {
      'drive.google.com': { registrar: 'Google', abuseEmail: 'abuse@google.com' },
      'mega.nz': { registrar: 'Mega Limited', abuseEmail: 'copyright@mega.nz' },
      'mediafire.com': { registrar: 'MediaFire', abuseEmail: 'abuse@mediafire.com' },
      'dropbox.com': { registrar: 'Dropbox', abuseEmail: 'copyright@dropbox.com' },
      't.me': { registrar: 'Telegram', abuseEmail: 'abuse@telegram.org' },
      'telegram.org': { registrar: 'Telegram', abuseEmail: 'abuse@telegram.org' },
      'discord.com': { registrar: 'Discord', abuseEmail: 'abuse@discord.com' },
      'reddit.com': { registrar: 'Reddit', abuseEmail: 'copyright@reddit.com' },
      'facebook.com': { registrar: 'Meta', abuseEmail: 'ip@fb.com' },
      'twitter.com': { registrar: 'Twitter/X', abuseEmail: 'copyright@twitter.com' },
      'x.com': { registrar: 'Twitter/X', abuseEmail: 'copyright@twitter.com' },
    };

    // Check if it's a known platform
    for (const [platformDomain, info] of Object.entries(knownPlatforms)) {
      if (domain.includes(platformDomain)) {
        return NextResponse.json({
          domain,
          registrar: info.registrar,
          abuseEmail: info.abuseEmail,
          suggestedRecipient: info.abuseEmail,
        });
      }
    }

    // For unknown domains, try to construct abuse@ email
    // In production, you'd use a WHOIS API service here
    const baseDomain = domain.replace('www.', '');
    const suggestedEmails = [
      `abuse@${baseDomain}`,
      `dmca@${baseDomain}`,
      `legal@${baseDomain}`,
      `admin@${baseDomain}`,
    ];

    return NextResponse.json({
      domain: baseDomain,
      registrar: 'Unknown',
      suggestedRecipient: suggestedEmails[0],
      suggestedAlternatives: suggestedEmails,
      note: 'WHOIS lookup not available. Common abuse email addresses are suggested.',
    });
  } catch (error) {
    console.error('WHOIS lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup domain information' },
      { status: 500 }
    );
  }
}
