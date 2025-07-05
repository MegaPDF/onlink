export async function getLocationFromIP(ip: string): Promise<{
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
}> {
  try {
    // Skip for local/private IPs
    if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return {
        country: 'Unknown',
        countryCode: 'XX',
        city: 'Unknown',
        region: 'Unknown'
      };
    }

    // Try multiple free IP geolocation services
    const services = [
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,city`,
      `https://ipapi.co/${ip}/json/`,
      `https://freegeoip.app/json/${ip}`
    ];

    for (const service of services) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(service, { 
          headers: { 'User-Agent': 'LinkShortener/1.0' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          
          // Handle different response formats
          if (service.includes('ip-api.com')) {
            if (data.status === 'success') {
              return {
                country: data.country,
                countryCode: data.countryCode,
                city: data.city,
                region: data.region
              };
            }
          } else if (service.includes('ipapi.co')) {
            if (data.country_name) {
              return {
                country: data.country_name,
                countryCode: data.country_code,
                city: data.city,
                region: data.region
              };
            }
          } else if (service.includes('freegeoip.app')) {
            if (data.country_name) {
              return {
                country: data.country_name,
                countryCode: data.country_code,
                city: data.city,
                region: data.region_name
              };
            }
          }
        }
      } catch (serviceError) {
        console.warn(`Geolocation service ${service} failed:`, serviceError);
        continue; // Try next service
      }
    }

    // Fallback if all services fail
    return {
      country: 'Unknown',
      countryCode: 'XX',
      city: 'Unknown',
      region: 'Unknown'
    };

  } catch (error) {
    console.error('Geolocation error:', error);
    return {
      country: 'Unknown',
      countryCode: 'XX',
      city: 'Unknown', 
      region: 'Unknown'
    };
  }
}
