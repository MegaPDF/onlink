// lib/dns-utils.ts - DNS Configuration Utilities
import dns from 'dns/promises';

export interface DNSRecord {
  type: 'A' | 'CNAME' | 'TXT' | 'MX' | 'NS';
  name: string;
  value: string;
  ttl?: number;
  priority?: number; // For MX records
}

export interface DomainVerificationResult {
  success: boolean;
  records: {
    record: DNSRecord;
    verified: boolean;
    error?: string;
  }[];
  errors: string[];
}

// Configure DNS for Node.js environment
dns.setServers([
  '8.8.8.8',      // Google DNS
  '8.8.4.4',      // Google DNS
  '1.1.1.1',      // Cloudflare DNS
  '1.0.0.1'       // Cloudflare DNS
]);

/**
 * Verify a single DNS record
 */
export async function verifyDNSRecord(record: DNSRecord): Promise<{ verified: boolean; error?: string }> {
  try {
    console.log(`Verifying ${record.type} record for ${record.name} → ${record.value}`);
    
    switch (record.type) {
      case 'TXT':
        const txtRecords = await dns.resolveTxt(record.name);
        const flatTxtRecords = txtRecords.flat();
        const verified = flatTxtRecords.some(txt => 
          txt.includes(record.value) || txt === record.value
        );
        console.log(`TXT verification: ${verified}`, { found: flatTxtRecords, expected: record.value });
        return { verified };
      
      case 'A':
        const aRecords = await dns.resolve4(record.name);
        const aVerified = aRecords.includes(record.value);
        console.log(`A verification: ${aVerified}`, { found: aRecords, expected: record.value });
        return { verified: aVerified };
      
      case 'CNAME':
        const cnameRecords = await dns.resolveCname(record.name);
        const cnameVerified = cnameRecords.some(cname => 
          cname === record.value || cname === record.value + '.'
        );
        console.log(`CNAME verification: ${cnameVerified}`, { found: cnameRecords, expected: record.value });
        return { verified: cnameVerified };
      
      case 'MX':
        const mxRecords = await dns.resolveMx(record.name);
        const mxVerified = mxRecords.some(mx => mx.exchange === record.value);
        console.log(`MX verification: ${mxVerified}`, { found: mxRecords, expected: record.value });
        return { verified: mxVerified };
      
      case 'NS':
        const nsRecords = await dns.resolveNs(record.name);
        const nsVerified = nsRecords.some(ns => ns === record.value || ns === record.value + '.');
        console.log(`NS verification: ${nsVerified}`, { found: nsRecords, expected: record.value });
        return { verified: nsVerified };
      
      default:
        return { verified: false, error: `Unsupported record type: ${record.type}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown DNS error';
    console.log(`DNS verification failed for ${record.name}:`, errorMessage);
    
    // Some DNS errors are expected and don't mean verification failed
    if (errorMessage.includes('NXDOMAIN') || errorMessage.includes('NOTFOUND')) {
      return { verified: false, error: 'DNS record not found' };
    }
    
    return { verified: false, error: errorMessage };
  }
}

/**
 * Verify multiple DNS records for a domain
 */
export async function verifyDomainRecords(records: DNSRecord[]): Promise<DomainVerificationResult> {
  const results = await Promise.allSettled(
    records.map(async (record) => {
      const result = await verifyDNSRecord(record);
      return {
        record,
        verified: result.verified,
        error: result.error
      };
    })
  );

  const verificationResults: DomainVerificationResult = {
    success: false,
    records: [],
    errors: []
  };

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      verificationResults.records.push(result.value);
    } else {
      verificationResults.records.push({
        record: records[index],
        verified: false,
        error: result.reason?.message || 'Verification failed'
      });
      verificationResults.errors.push(`Record ${index + 1}: ${result.reason?.message || 'Unknown error'}`);
    }
  });

  // Check if all required records are verified
  verificationResults.success = verificationResults.records.every(r => r.verified);

  return verificationResults;
}

/**
 * Generate DNS records for domain verification
 */
export function generateDomainVerificationRecords(
  domain: string, 
  verificationCode: string,
  serverIP?: string
): DNSRecord[] {
  const records: DNSRecord[] = [];

  // Add verification TXT record
  records.push({
    type: 'TXT',
    name: `_verification.${domain}`,
    value: verificationCode,
    ttl: 300
  });

  // Add A record pointing to server IP (if provided)
  if (serverIP) {
    records.push({
      type: 'A',
      name: domain,
      value: serverIP,
      ttl: 3600
    });

    // Add www CNAME record
    records.push({
      type: 'CNAME',
      name: `www.${domain}`,
      value: domain,
      ttl: 3600
    });
  }

  return records;
}

/**
 * Generate nameserver records for subdomain delegation
 */
export function generateNameserverRecords(
  subdomain: string,
  nameservers: string[]
): DNSRecord[] {
  return nameservers.map(ns => ({
    type: 'NS' as const,
    name: subdomain,
    value: ns.endsWith('.') ? ns : `${ns}.`,
    ttl: 86400
  }));
}

/**
 * Validate domain name format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
  
  // Allow localhost with port for development
  if (domain.startsWith('localhost:')) {
    const port = domain.split(':')[1];
    return /^\d+$/.test(port) && parseInt(port) > 0 && parseInt(port) <= 65535;
  }
  
  return domainRegex.test(domain) && domain.length <= 253;
}

/**
 * Extract root domain from subdomain
 */
export function getRootDomain(domain: string): string {
  // Handle localhost
  if (domain.startsWith('localhost')) {
    return domain;
  }
  
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return domain;
}

/**
 * Check if domain is a subdomain
 */
export function isSubdomain(domain: string): boolean {
  if (domain.startsWith('localhost')) {
    return false;
  }
  
  const parts = domain.split('.');
  return parts.length > 2;
}

/**
 * Get domain nameservers
 */
export async function getDomainNameservers(domain: string): Promise<string[]> {
  try {
    const rootDomain = getRootDomain(domain);
    const nameservers = await dns.resolveNs(rootDomain);
    return nameservers;
  } catch (error) {
    console.error(`Failed to get nameservers for ${domain}:`, error);
    return [];
  }
}

/**
 * Check domain DNS propagation status
 */
export async function checkDNSPropagation(domain: string): Promise<{
  propagated: boolean;
  nameservers: string[];
  errors: string[];
}> {
  const result = {
    propagated: false,
    nameservers: [] as string[],
    errors: [] as string[]
  };

  try {
    // Check if domain resolves
    await dns.resolve4(domain);
    result.propagated = true;
  } catch (error) {
    result.errors.push(`Domain resolution failed: ${error}`);
  }

  try {
    // Get nameservers
    result.nameservers = await getDomainNameservers(domain);
  } catch (error) {
    result.errors.push(`Failed to get nameservers: ${error}`);
  }

  return result;
}

/**
 * Generate DNS configuration instructions
 */
export function generateDNSInstructions(
  domain: string,
  records: DNSRecord[],
  provider?: string
): {
  instructions: string[];
  records: DNSRecord[];
  troubleshooting: string[];
} {
  const instructions = [
    `Configure DNS records for ${domain}:`,
    '',
    'Add the following DNS records to your domain registrar or DNS provider:',
    ''
  ];

  // Add record-specific instructions
  records.forEach((record, index) => {
    instructions.push(`${index + 1}. ${record.type} Record:`);
    instructions.push(`   Name: ${record.name}`);
    instructions.push(`   Value: ${record.value}`);
    if (record.ttl) {
      instructions.push(`   TTL: ${record.ttl} seconds`);
    }
    if (record.priority) {
      instructions.push(`   Priority: ${record.priority}`);
    }
    instructions.push('');
  });

  // Add provider-specific instructions
  if (provider) {
    instructions.push(`Provider-specific notes for ${provider}:`);
    switch (provider.toLowerCase()) {
      case 'cloudflare':
        instructions.push('- Set proxy status to "DNS only" (gray cloud) for verification');
        instructions.push('- Use "@" for root domain records');
        break;
      case 'godaddy':
        instructions.push('- Use "@" for root domain records');
        instructions.push('- TTL can be set to "1 Hour" for faster propagation');
        break;
      case 'namecheap':
        instructions.push('- Use "@" for root domain records');
        instructions.push('- Ensure Advanced DNS is enabled');
        break;
      default:
        instructions.push('- Follow your DNS provider\'s documentation');
    }
    instructions.push('');
  }

  instructions.push('After adding records:');
  instructions.push('1. Wait for DNS propagation (5 minutes to 48 hours)');
  instructions.push('2. Use online DNS checker tools to verify propagation');
  instructions.push('3. Click "Verify Domain" to complete setup');

  const troubleshooting = [
    'If verification fails:',
    '1. Check that all DNS records are correctly entered',
    '2. Verify TTL settings (lower TTL = faster propagation)',
    '3. Wait longer for global DNS propagation',
    '4. Use dig or nslookup to test records manually',
    '5. Contact your DNS provider for assistance'
  ];

  return {
    instructions,
    records,
    troubleshooting
  };
}

/**
 * DNS record formatting utilities
 */
export const DNSFormatter = {
  /**
   * Format record for display
   */
  formatRecord(record: DNSRecord): string {
    let formatted = `${record.type} ${record.name} ${record.value}`;
    if (record.ttl) {
      formatted += ` (TTL: ${record.ttl}s)`;
    }
    if (record.priority) {
      formatted += ` (Priority: ${record.priority})`;
    }
    return formatted;
  },

  /**
   * Format records as table
   */
  formatAsTable(records: DNSRecord[]): string {
    const headers = ['Type', 'Name', 'Value', 'TTL'];
    const rows = records.map(record => [
      record.type,
      record.name,
      record.value,
      record.ttl?.toString() || 'Default'
    ]);

    const colWidths = headers.map((header, i) => 
      Math.max(header.length, ...rows.map(row => row[i].length))
    );

    const formatRow = (row: string[]) => 
      row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ');

    return [
      formatRow(headers),
      colWidths.map(w => '-'.repeat(w)).join('-|-'),
      ...rows.map(formatRow)
    ].join('\n');
  },

  /**
   * Format for bind zone file
   */
  formatAsZoneFile(domain: string, records: DNSRecord[]): string {
    const lines = [
      `; DNS Zone file for ${domain}`,
      `; Generated on ${new Date().toISOString()}`,
      '',
      `$ORIGIN ${domain}.`,
      '$TTL 3600',
      ''
    ];

    records.forEach(record => {
      const name = record.name === domain ? '@' : record.name.replace(`.${domain}`, '');
      const ttl = record.ttl || 3600;
      
      if (record.type === 'MX') {
        lines.push(`${name} ${ttl} IN ${record.type} ${record.priority || 10} ${record.value}.`);
      } else if (record.type === 'TXT') {
        lines.push(`${name} ${ttl} IN ${record.type} "${record.value}"`);
      } else {
        lines.push(`${name} ${ttl} IN ${record.type} ${record.value}${record.type === 'CNAME' ? '.' : ''}`);
      }
    });

    return lines.join('\n');
  }
};