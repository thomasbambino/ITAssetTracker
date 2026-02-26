import archiver from 'archiver';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { PassThrough } from 'stream';

interface LbxGeneratorParams {
  deviceName: string;
  qrCodeValue: string;
  logo?: string; // Base64 encoded logo image
}

// Label dimensions in points (72 points = 1 inch)
// For a 24mm x 100mm label
const LABEL_WIDTH_PT = 283; // ~100mm
const LABEL_HEIGHT_PT = 68;  // ~24mm

// Generate a monochrome PNG from image data (P-Touch Editor supports PNG in lbx)
async function generateImageFromBuffer(buffer: Buffer, width: number, height: number): Promise<Buffer> {
  // Resize and convert to monochrome PNG
  const processedImage = await sharp(buffer)
    .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
    .threshold(128) // Convert to monochrome
    .png()
    .toBuffer();

  return processedImage;
}

// Generate QR code as PNG
async function generateQrCodeImage(value: string, size: number): Promise<Buffer> {
  // Generate QR code as PNG buffer
  const qrPngBuffer = await QRCode.toBuffer(value, {
    type: 'png',
    width: size,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  // Ensure it's a clean PNG
  const cleanPng = await sharp(qrPngBuffer)
    .threshold(128)
    .png()
    .toBuffer();

  return cleanPng;
}

// Generate text as PNG image
async function generateTextImage(text: string, width: number, height: number, fontSize: number = 12): Promise<Buffer> {
  // Create SVG with text
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <text x="5" y="${height / 2 + fontSize / 3}"
            font-family="Arial, sans-serif"
            font-size="${fontSize}"
            font-weight="bold"
            fill="black">${escapeXml(text)}</text>
    </svg>
  `;

  const pngBuffer = await sharp(Buffer.from(svg))
    .threshold(128)
    .png()
    .toBuffer();

  return pngBuffer;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate the label.xml content
function generateLabelXml(deviceName: string, qrCodeValue: string, hasLogo: boolean): string {
  // Object positions in points
  const qrCodeSize = 50;
  const qrCodeX = LABEL_WIDTH_PT - qrCodeSize - 10;
  const qrCodeY = (LABEL_HEIGHT_PT - qrCodeSize) / 2;

  const logoWidth = 30;
  const logoHeight = 30;
  const logoX = 10;
  const logoY = (LABEL_HEIGHT_PT - logoHeight) / 2 + 8;

  const deviceNameX = 10;
  const deviceNameY = 8;
  const deviceNameWidth = LABEL_WIDTH_PT - qrCodeSize - 30;
  const deviceNameHeight = 20;

  const qrCodeTextX = hasLogo ? logoX + logoWidth + 10 : 10;
  const qrCodeTextY = logoY;
  const qrCodeTextWidth = qrCodeX - qrCodeTextX - 10;
  const qrCodeTextHeight = 20;

  return `<?xml version="1.0" encoding="UTF-8"?>
<label version="1.0">
  <paper width="${LABEL_WIDTH_PT}" height="${LABEL_HEIGHT_PT}" orientation="landscape">
    <margins left="5" right="5" top="5" bottom="5"/>
  </paper>
  <objects>
    <!-- Device Name Text -->
    <object type="text" name="deviceName">
      <position x="${deviceNameX}" y="${deviceNameY}"/>
      <size width="${deviceNameWidth}" height="${deviceNameHeight}"/>
      <font name="Arial" size="10" bold="true"/>
      <text>${escapeXml(deviceName)}</text>
    </object>

    ${hasLogo ? `
    <!-- Logo Image -->
    <object type="image" name="logo">
      <position x="${logoX}" y="${logoY}"/>
      <size width="${logoWidth}" height="${logoHeight}"/>
      <file>Object2.png</file>
    </object>
    ` : ''}

    <!-- QR Code Value Text -->
    <object type="text" name="qrCodeText">
      <position x="${qrCodeTextX}" y="${qrCodeTextY}"/>
      <size width="${qrCodeTextWidth}" height="${qrCodeTextHeight}"/>
      <font name="Arial" size="8" bold="false"/>
      <text>${escapeXml(qrCodeValue)}</text>
    </object>

    <!-- QR Code Image -->
    <object type="image" name="qrCode">
      <position x="${qrCodeX}" y="${qrCodeY}"/>
      <size width="${qrCodeSize}" height="${qrCodeSize}"/>
      <file>Object0.png</file>
    </object>
  </objects>
</label>`;
}

// Generate the prop.xml content
function generatePropXml(): string {
  const now = new Date();
  const dateStr = now.toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<properties>
  <property name="creator" value="IT Asset Manager"/>
  <property name="creationDate" value="${dateStr}"/>
  <property name="revision" value="1"/>
  <property name="lastModified" value="${dateStr}"/>
  <property name="labelType" value="P-Touch"/>
</properties>`;
}

export async function generateLbxFile(params: LbxGeneratorParams): Promise<Buffer> {
  const { deviceName, qrCodeValue, logo } = params;

  // Create a pass-through stream to collect the ZIP data
  const passThrough = new PassThrough();
  const chunks: Buffer[] = [];

  passThrough.on('data', (chunk) => chunks.push(chunk));

  // Create ZIP archive
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  archive.pipe(passThrough);

  // Generate QR code PNG (Object0.png)
  const qrCodePng = await generateQrCodeImage(qrCodeValue, 100);
  archive.append(qrCodePng, { name: 'Object0.png' });

  // Generate device ID text as PNG (Object1.png)
  const textPng = await generateTextImage(qrCodeValue, 200, 30, 10);
  archive.append(textPng, { name: 'Object1.png' });

  // Generate logo PNG if provided (Object2.png)
  const hasLogo = !!logo;
  if (logo) {
    try {
      // Remove data URL prefix if present
      const base64Data = logo.replace(/^data:image\/\w+;base64,/, '');
      const logoBuffer = Buffer.from(base64Data, 'base64');
      const logoPng = await generateImageFromBuffer(logoBuffer, 60, 60);
      archive.append(logoPng, { name: 'Object2.png' });
    } catch (error) {
      console.error('Error processing logo:', error);
      // Continue without logo if there's an error
    }
  }

  // Generate and append label.xml
  const labelXml = generateLabelXml(deviceName, qrCodeValue, hasLogo);
  archive.append(labelXml, { name: 'label.xml' });

  // Generate and append prop.xml
  const propXml = generatePropXml();
  archive.append(propXml, { name: 'prop.xml' });

  // Finalize the archive
  archive.finalize();

  // Wait for all data to be collected
  return new Promise((resolve, reject) => {
    passThrough.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    passThrough.on('error', reject);
  });
}

// Export types for use in routes
export type { LbxGeneratorParams };
