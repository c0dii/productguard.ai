import whoiser = require('whoiser');
import dns from 'dns/promises';
import { InfrastructureProfile } from '@/types';

/**
 * Infrastructure Profiler
 *
 * Collects infrastructure data about an infringing URL to identify:
 * - Hosting provider (for DMCA to host)
 * - Domain registrar (for escalation)
 * - CDN (for CDN-specific takedown routes)
 * - Abuse contacts (for direct enforcement)
 * - Nameservers (for DNS-level blocking)
 *
 * This data powers smart DMCA routing and escalation chains.
 */

export class InfrastructureProfiler {
  /**
   * Profile a URL to gather infrastructure data
   */
  async profile(url: string): Promise<InfrastructureProfile> {
    const domain = this.extractDomain(url);

    if (!domain) {
      return this.emptyProfile();
    }

    try {
      // Run all lookups in parallel for speed
      const [whoisData, ipAddress, nameservers] = await Promise.all([
        this.performWhoisLookup(domain),
        this.resolveIpAddress(domain),
        this.getNameservers(domain),
      ]);

      // Get geolocation data from IP
      const geolocation = ipAddress ? await this.getIpGeolocation(ipAddress) : null;

      // Get hosting provider from IP
      const hostingProvider = ipAddress ? await this.identifyHostingProvider(ipAddress) : null;

      // Detect CDN from DNS or headers
      const cdn = this.detectCDN(nameservers, hostingProvider);

      // Extract detailed WHOIS information
      const abuseContact = this.extractAbuseContact(whoisData);
      const registrar = this.extractRegistrar(whoisData);
      const registrarUrl = this.extractRegistrarUrl(whoisData);
      const creationDate = this.extractCreationDate(whoisData);
      const expirationDate = this.extractExpirationDate(whoisData);
      const registrantCountry = this.extractRegistrantCountry(whoisData);
      const adminEmail = this.extractAdminEmail(whoisData);
      const techEmail = this.extractTechEmail(whoisData);

      return {
        hosting_provider: hostingProvider,
        registrar: registrar,
        registrar_url: registrarUrl,
        cdn: cdn,
        nameservers: nameservers,
        abuse_contact: abuseContact,
        admin_email: adminEmail,
        tech_email: techEmail,
        ip_address: ipAddress,
        country: geolocation?.country || registrantCountry,
        region: geolocation?.region,
        city: geolocation?.city,
        asn: geolocation?.asn,
        asn_org: geolocation?.org,
        creation_date: creationDate,
        expiration_date: expirationDate,
        whois_data: whoisData, // Store raw WHOIS for reference
      };
    } catch (error) {
      console.error('[Infrastructure Profiler] Error profiling domain:', domain, error);
      return this.emptyProfile();
    }
  }

  /**
   * Get IP geolocation data
   */
  private async getIpGeolocation(ipAddress: string): Promise<{
    country: string | null;
    region: string | null;
    city: string | null;
    asn: string | null;
    org: string | null;
  } | null> {
    try {
      // Use ip-api.com (free, no API key required)
      const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,regionName,city,as,org,isp`);

      if (!response.ok) {
        console.error('[Infrastructure Profiler] IP geolocation API failed:', response.status);
        return null;
      }

      const data = await response.json();

      if (data.status !== 'success') {
        return null;
      }

      // Extract ASN from "as" field (format: "AS15169 Google LLC")
      const asnMatch = data.as?.match(/^AS(\d+)/);
      const asn = asnMatch ? asnMatch[1] : null;

      return {
        country: data.country || null,
        region: data.regionName || null,
        city: data.city || null,
        asn: asn,
        org: data.org || data.isp || null,
      };
    } catch (error) {
      console.error('[Infrastructure Profiler] IP geolocation failed:', error);
      return null;
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  /**
   * Perform WHOIS lookup
   */
  private async performWhoisLookup(domain: string): Promise<any> {
    try {
      const whoisResult = await whoiser(domain, { follow: 2, timeout: 5000 });
      return whoisResult;
    } catch (error) {
      console.error('[Infrastructure Profiler] WHOIS lookup failed:', error);
      return null;
    }
  }

  /**
   * Resolve domain to IP address
   */
  private async resolveIpAddress(domain: string): Promise<string | null> {
    try {
      const addresses = await dns.resolve4(domain);
      return addresses[0] || null;
    } catch (error) {
      console.error('[Infrastructure Profiler] DNS resolution failed:', error);
      return null;
    }
  }

  /**
   * Get nameservers for domain
   */
  private async getNameservers(domain: string): Promise<string[]> {
    try {
      const nameservers = await dns.resolveNs(domain);
      return nameservers;
    } catch (error) {
      console.error('[Infrastructure Profiler] Nameserver lookup failed:', error);
      return [];
    }
  }

  /**
   * Identify hosting provider from IP address
   * Uses common hosting provider IP ranges and reverse DNS
   */
  private async identifyHostingProvider(ipAddress: string): Promise<string | null> {
    try {
      // Try reverse DNS lookup first
      const hostnames = await dns.reverse(ipAddress);
      const hostname = hostnames[0];

      if (hostname) {
        // Check for common hosting providers in reverse DNS
        if (hostname.includes('cloudflare')) return 'Cloudflare';
        if (hostname.includes('amazonaws')) return 'Amazon Web Services (AWS)';
        if (hostname.includes('googleusercontent') || hostname.includes('google')) return 'Google Cloud';
        if (hostname.includes('digitalocean')) return 'DigitalOcean';
        if (hostname.includes('linode')) return 'Linode';
        if (hostname.includes('vultr')) return 'Vultr';
        if (hostname.includes('ovh')) return 'OVH';
        if (hostname.includes('hetzner')) return 'Hetzner';
        if (hostname.includes('azure') || hostname.includes('microsoft')) return 'Microsoft Azure';
        if (hostname.includes('godaddy')) return 'GoDaddy';
        if (hostname.includes('namecheap')) return 'Namecheap';
        if (hostname.includes('bluehost')) return 'Bluehost';
        if (hostname.includes('hostgator')) return 'HostGator';
        if (hostname.includes('dreamhost')) return 'DreamHost';
        if (hostname.includes('siteground')) return 'SiteGround';

        // Return the hostname if no match
        return hostname;
      }

      // TODO Phase 2: Use IP geolocation API (ipinfo.io, MaxMind, etc.) for better accuracy
      return null;
    } catch (error) {
      console.error('[Infrastructure Profiler] Hosting provider identification failed:', error);
      return null;
    }
  }

  /**
   * Detect CDN from nameservers or hosting provider
   */
  private detectCDN(nameservers: string[], hostingProvider: string | null): string | null {
    // Check nameservers for common CDN providers
    const nsString = nameservers.join(' ').toLowerCase();

    if (nsString.includes('cloudflare')) return 'Cloudflare';
    if (nsString.includes('fastly')) return 'Fastly';
    if (nsString.includes('akamai')) return 'Akamai';
    if (nsString.includes('cloudfront')) return 'Amazon CloudFront';
    if (nsString.includes('cdn77')) return 'CDN77';
    if (nsString.includes('maxcdn') || nsString.includes('stackpath')) return 'StackPath';
    if (nsString.includes('bunnycdn')) return 'BunnyCDN';
    if (nsString.includes('keycdn')) return 'KeyCDN';

    // Check if hosting provider is also a CDN
    if (hostingProvider === 'Cloudflare') return 'Cloudflare';

    return null;
  }

  /**
   * Extract abuse contact from WHOIS data
   */
  private extractAbuseContact(whoisData: any): string | null {
    if (!whoisData) return null;

    try {
      // WHOIS data structure varies by TLD, so we need to handle different formats
      const whoisText = JSON.stringify(whoisData).toLowerCase();

      // Look for abuse email patterns
      const abuseEmailMatch = whoisText.match(/abuse.*?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
      if (abuseEmailMatch) return abuseEmailMatch[1];

      // Look for any email in the WHOIS data as fallback
      const emailMatch = whoisText.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
      if (emailMatch) return emailMatch[1];

      // Try to extract from structured data
      for (const [key, value] of Object.entries(whoisData)) {
        if (typeof value === 'object' && value !== null) {
          // Check for abuse contact fields
          if ('Registrar Abuse Contact Email' in value) {
            return (value as any)['Registrar Abuse Contact Email'];
          }
          if ('abuse' in value || 'Abuse' in value) {
            const abuseField = (value as any)['abuse'] || (value as any)['Abuse'];
            if (typeof abuseField === 'string' && abuseField.includes('@')) {
              return abuseField;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('[Infrastructure Profiler] Abuse contact extraction failed:', error);
      return null;
    }
  }

  /**
   * Extract registrar from WHOIS data
   */
  private extractRegistrar(whoisData: any): string | null {
    if (!whoisData) return null;

    try {
      // Try to extract from structured data
      for (const [key, value] of Object.entries(whoisData)) {
        if (typeof value === 'object' && value !== null) {
          // Common registrar fields
          if ('Registrar' in value) {
            return (value as any)['Registrar'];
          }
          if ('registrar' in value) {
            return (value as any)['registrar'];
          }
          if ('Registrar Name' in value) {
            return (value as any)['Registrar Name'];
          }
        }
      }

      // Look for registrar in text format
      const whoisText = JSON.stringify(whoisData);
      const registrarMatch = whoisText.match(/[Rr]egistrar:\s*([^\n,"]+)/);
      if (registrarMatch) return registrarMatch[1].trim();

      return null;
    } catch (error) {
      console.error('[Infrastructure Profiler] Registrar extraction failed:', error);
      return null;
    }
  }

  /**
   * Extract registrar URL from WHOIS data
   */
  private extractRegistrarUrl(whoisData: any): string | null {
    if (!whoisData) return null;

    try {
      const whoisText = JSON.stringify(whoisData);
      const urlMatch = whoisText.match(/[Rr]egistrar URL:\s*(https?:\/\/[^\s,"]+)/);
      if (urlMatch) return urlMatch[1].trim();

      // Try structured data
      for (const [key, value] of Object.entries(whoisData)) {
        if (typeof value === 'object' && value !== null) {
          if ('Registrar URL' in value) {
            return (value as any)['Registrar URL'];
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract creation date from WHOIS data
   */
  private extractCreationDate(whoisData: any): string | null {
    if (!whoisData) return null;

    try {
      for (const [key, value] of Object.entries(whoisData)) {
        if (typeof value === 'object' && value !== null) {
          const fields = ['Creation Date', 'Created Date', 'Domain Registration Date', 'created'];
          for (const field of fields) {
            if (field in value) {
              return (value as any)[field];
            }
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract expiration date from WHOIS data
   */
  private extractExpirationDate(whoisData: any): string | null {
    if (!whoisData) return null;

    try {
      for (const [key, value] of Object.entries(whoisData)) {
        if (typeof value === 'object' && value !== null) {
          const fields = ['Expiration Date', 'Registry Expiry Date', 'Expiry Date', 'expires'];
          for (const field of fields) {
            if (field in value) {
              return (value as any)[field];
            }
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract registrant country from WHOIS data
   */
  private extractRegistrantCountry(whoisData: any): string | null {
    if (!whoisData) return null;

    try {
      for (const [key, value] of Object.entries(whoisData)) {
        if (typeof value === 'object' && value !== null) {
          const fields = ['Registrant Country', 'Country', 'country'];
          for (const field of fields) {
            if (field in value) {
              return (value as any)[field];
            }
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract admin email from WHOIS data
   */
  private extractAdminEmail(whoisData: any): string | null {
    if (!whoisData) return null;

    try {
      for (const [key, value] of Object.entries(whoisData)) {
        if (typeof value === 'object' && value !== null) {
          const fields = ['Admin Email', 'Administrative Contact Email'];
          for (const field of fields) {
            if (field in value) {
              const email = (value as any)[field];
              if (email && email.includes('@')) {
                return email;
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract tech email from WHOIS data
   */
  private extractTechEmail(whoisData: any): string | null {
    if (!whoisData) return null;

    try {
      for (const [key, value] of Object.entries(whoisData)) {
        if (typeof value === 'object' && value !== null) {
          const fields = ['Tech Email', 'Technical Contact Email'];
          for (const field of fields) {
            if (field in value) {
              const email = (value as any)[field];
              if (email && email.includes('@')) {
                return email;
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Return empty profile when lookup fails
   */
  private emptyProfile(): InfrastructureProfile {
    return {
      hosting_provider: null,
      registrar: null,
      cdn: null,
      nameservers: [],
      abuse_contact: null,
    };
  }
}

// Singleton instance
export const infrastructureProfiler = new InfrastructureProfiler();
