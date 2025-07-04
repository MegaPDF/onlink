// ============= lib/qr-generator.ts =============
import QRCode from 'qrcode';
import { QRCodeOptions } from '@/types/url';

export class QRCodeGenerator {
  
  static async generateQRCode(
    url: string, 
    options: Partial<QRCodeOptions> = {}
  ): Promise<string> {
    const defaultOptions = {
      size: 200,
      color: '#000000',
      backgroundColor: '#FFFFFF',
      format: 'png' as const
    };
    
    const qrOptions = { ...defaultOptions, ...options };
    
    try {
      const qrCodeDataURL = await QRCode.toDataURL(url, {
        width: qrOptions.size,
        margin: 2,
        color: {
          dark: qrOptions.color,
          light: qrOptions.backgroundColor
        },
        errorCorrectionLevel: 'M'
      });
      
      return qrCodeDataURL;
    } catch (error) {
      console.error('QR code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }
  
  static async generateQRCodeSVG(
    url: string, 
    options: Partial<QRCodeOptions> = {}
  ): Promise<string> {
    const defaultOptions = {
      size: 200,
      color: '#000000',
      backgroundColor: '#FFFFFF'
    };
    
    const qrOptions = { ...defaultOptions, ...options };
    
    try {
      const qrCodeSVG = await QRCode.toString(url, {
        type: 'svg',
        width: qrOptions.size,
        margin: 2,
        color: {
          dark: qrOptions.color,
          light: qrOptions.backgroundColor
        },
        errorCorrectionLevel: 'M'
      });
      
      return qrCodeSVG;
    } catch (error) {
      console.error('QR code SVG generation error:', error);
      throw new Error('Failed to generate QR code SVG');
    }
  }
  
  static async generateQRCodeBuffer(
    url: string, 
    options: Partial<QRCodeOptions> = {}
  ): Promise<Buffer> {
    const defaultOptions = {
      size: 200,
      color: '#000000',
      backgroundColor: '#FFFFFF'
    };
    
    const qrOptions = { ...defaultOptions, ...options };
    
    try {
      const buffer = await QRCode.toBuffer(url, {
        width: qrOptions.size,
        margin: 2,
        color: {
          dark: qrOptions.color,
          light: qrOptions.backgroundColor
        },
        errorCorrectionLevel: 'M'
      });
      
      return buffer;
    } catch (error) {
      console.error('QR code buffer generation error:', error);
      throw new Error('Failed to generate QR code buffer');
    }
  }
  
  static async generateBatchQRCodes(
    urls: string[], 
    options: Partial<QRCodeOptions> = {}
  ): Promise<{ url: string; qrCode: string; error?: string }[]> {
    const results: { url: string; qrCode: string; error?: string }[] = [];
    
    for (const url of urls) {
      try {
        const qrCode = await this.generateQRCode(url, options);
        results.push({ url, qrCode });
      } catch (error) {
        results.push({ 
          url, 
          qrCode: '', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    return results;
  }
  
  static getQRCodeDownloadUrl(shortCode: string, format: string = 'png'): string {
    return `/api/client/qrcode/download?code=${shortCode}&format=${format}`;
  }
}
