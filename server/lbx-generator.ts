import archiver from 'archiver';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { PassThrough } from 'stream';

interface LbxGeneratorParams {
  deviceName: string;
  qrCodeValue: string;
  logo?: string; // Base64 encoded logo image
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate QR code as BMP buffer
async function generateQrCodeBmp(value: string, size: number): Promise<Buffer> {
  const qrPngBuffer = await QRCode.toBuffer(value, {
    type: 'png',
    width: size,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  // Convert to 1-bit BMP (monochrome) which Brother printers expect
  const bmpBuffer = await sharp(qrPngBuffer)
    .resize(size, size)
    .threshold(128)
    .toColorspace('b-w')
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Create BMP manually for 1-bit monochrome
  return createMonochromeBmp(bmpBuffer.data, size, size);
}

// Generate logo as BMP buffer
async function generateLogoBmp(logoBase64: string, size: number): Promise<Buffer> {
  const base64Data = logoBase64.replace(/^data:image\/\w+;base64,/, '');
  const logoBuffer = Buffer.from(base64Data, 'base64');

  const processedBuffer = await sharp(logoBuffer)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
    .threshold(128)
    .toColorspace('b-w')
    .raw()
    .toBuffer({ resolveWithObject: true });

  return createMonochromeBmp(processedBuffer.data, size, size);
}

// Create a 1-bit monochrome BMP file
function createMonochromeBmp(rawData: Buffer, width: number, height: number): Buffer {
  // BMP row stride must be multiple of 4 bytes
  const bitsPerPixel = 1;
  const rowSize = Math.ceil(width / 8);
  const paddedRowSize = Math.ceil(rowSize / 4) * 4;
  const pixelDataSize = paddedRowSize * height;

  // BMP file header (14 bytes) + DIB header (40 bytes) + color table (8 bytes for 2 colors)
  const headerSize = 14 + 40 + 8;
  const fileSize = headerSize + pixelDataSize;

  const bmp = Buffer.alloc(fileSize);
  let offset = 0;

  // BMP File Header (14 bytes)
  bmp.write('BM', offset); offset += 2;           // Signature
  bmp.writeUInt32LE(fileSize, offset); offset += 4;  // File size
  bmp.writeUInt16LE(0, offset); offset += 2;      // Reserved
  bmp.writeUInt16LE(0, offset); offset += 2;      // Reserved
  bmp.writeUInt32LE(headerSize, offset); offset += 4; // Pixel data offset

  // DIB Header (BITMAPINFOHEADER - 40 bytes)
  bmp.writeUInt32LE(40, offset); offset += 4;     // DIB header size
  bmp.writeInt32LE(width, offset); offset += 4;   // Width
  bmp.writeInt32LE(height, offset); offset += 4;  // Height (positive = bottom-up)
  bmp.writeUInt16LE(1, offset); offset += 2;      // Color planes
  bmp.writeUInt16LE(bitsPerPixel, offset); offset += 2; // Bits per pixel
  bmp.writeUInt32LE(0, offset); offset += 4;      // Compression (none)
  bmp.writeUInt32LE(pixelDataSize, offset); offset += 4; // Image size
  bmp.writeInt32LE(2835, offset); offset += 4;    // Horizontal resolution (72 DPI)
  bmp.writeInt32LE(2835, offset); offset += 4;    // Vertical resolution (72 DPI)
  bmp.writeUInt32LE(2, offset); offset += 4;      // Colors in palette
  bmp.writeUInt32LE(0, offset); offset += 4;      // Important colors

  // Color table (2 colors: black and white)
  // Color 0: Black (BGR + reserved)
  bmp.writeUInt8(0, offset); offset += 1;
  bmp.writeUInt8(0, offset); offset += 1;
  bmp.writeUInt8(0, offset); offset += 1;
  bmp.writeUInt8(0, offset); offset += 1;
  // Color 1: White (BGR + reserved)
  bmp.writeUInt8(255, offset); offset += 1;
  bmp.writeUInt8(255, offset); offset += 1;
  bmp.writeUInt8(255, offset); offset += 1;
  bmp.writeUInt8(0, offset); offset += 1;

  // Pixel data (bottom-up, 1 bit per pixel)
  for (let y = height - 1; y >= 0; y--) {
    let byteVal = 0;
    let bitIndex = 7;
    let rowOffset = 0;

    for (let x = 0; x < width; x++) {
      const pixelIndex = y * width + x;
      // rawData is grayscale, 0 = black, 255 = white
      // In 1-bit BMP: 0 = color 0 (black), 1 = color 1 (white)
      const isWhite = rawData[pixelIndex] > 128 ? 1 : 0;
      byteVal |= (isWhite << bitIndex);
      bitIndex--;

      if (bitIndex < 0 || x === width - 1) {
        bmp.writeUInt8(byteVal, offset + rowOffset);
        rowOffset++;
        byteVal = 0;
        bitIndex = 7;
      }
    }

    // Add padding bytes to make row size multiple of 4
    while (rowOffset < paddedRowSize) {
      bmp.writeUInt8(0, offset + rowOffset);
      rowOffset++;
    }
    offset += paddedRowSize;
  }

  return bmp;
}

// Generate the label.xml content in Brother P-Touch format
function generateLabelXml(deviceName: string, qrCodeValue: string, hasLogo: boolean): string {
  const escapedDeviceName = escapeXml(deviceName);
  const escapedQrValue = escapeXml(qrCodeValue);

  return `<?xml version="1.0" encoding="UTF-8"?><pt:document xmlns:pt="http://schemas.brother.info/ptouch/2007/lbx/main" xmlns:style="http://schemas.brother.info/ptouch/2007/lbx/style" xmlns:text="http://schemas.brother.info/ptouch/2007/lbx/text" xmlns:draw="http://schemas.brother.info/ptouch/2007/lbx/draw" xmlns:image="http://schemas.brother.info/ptouch/2007/lbx/image" xmlns:barcode="http://schemas.brother.info/ptouch/2007/lbx/barcode" xmlns:database="http://schemas.brother.info/ptouch/2007/lbx/database" xmlns:table="http://schemas.brother.info/ptouch/2007/lbx/table" xmlns:cable="http://schemas.brother.info/ptouch/2007/lbx/cable" version="1.5" generator="P-touch Editor 5.4.003 Windows"><pt:body currentSheet="Sheet 1" direction="LTR"><style:sheet name="Sheet 1"><style:paper media="0" width="82.1pt" height="283.5pt" marginLeft="4.3pt" marginTop="8.4pt" marginRight="4.4pt" marginBottom="8.4pt" orientation="landscape" autoLength="true" monochromeDisplay="true" printColorDisplay="false" printColorsID="0" paperColor="#FFFFFF" paperInk="#000000" split="1" format="258" backgroundTheme="0" printerID="14388" printerName="Brother QL-800"/><style:cutLine regularCut="0pt" freeCut=""/><style:backGround x="8.4pt" y="4.3pt" width="212pt" height="73.5pt" brushStyle="NULL" brushId="0" userPattern="NONE" userPatternId="0" color="#000000" printColorNumber="1" backColor="#FFFFFF" backPrintColorNumber="0"/><pt:objects><text:text><pt:objectStyle x="10.4pt" y="4.4pt" width="140pt" height="18pt" backColor="#FFFFFF" backPrintColorNumber="0" ropMode="COPYPEN" angle="0" anchor="TOPLEFT" flip="NONE"><pt:pen style="NULL" widthX="0.5pt" widthY="0.5pt" color="#000000" printColorNumber="1"/><pt:brush style="NULL" color="#000000" printColorNumber="1" id="0"/><pt:expanded objectName="DeviceName" ID="0" lock="0" templateMergeTarget="LABELLIST" templateMergeType="NONE" templateMergeID="0" linkStatus="NONE" linkID="0"/></pt:objectStyle><text:ptFontInfo><text:logFont name="Arial" width="0" italic="false" weight="700" charSet="0" pitchAndFamily="34"/><text:fontExt effect="NOEFFECT" underline="0" strikeout="0" size="9pt" orgSize="9pt" textColor="#000000" textPrintColorNumber="1"/></text:ptFontInfo><text:textControl control="FREE" clipFrame="false" aspectNormal="false" shrink="true" autoLF="false" avoidImage="false"/><text:textAlign horizontalAlignment="LEFT" verticalAlignment="CENTER" inLineAlignment="BASELINE"/><text:textStyle vertical="false" nullBlock="false" charSpace="0" lineSpace="0" orgPoint="9pt" combinedChars="false"/><pt:data>${escapedDeviceName}</pt:data><text:stringItem charLen="${deviceName.length}"><text:ptFontInfo><text:logFont name="Arial" width="0" italic="false" weight="700" charSet="0" pitchAndFamily="34"/><text:fontExt effect="NOEFFECT" underline="0" strikeout="0" size="9pt" orgSize="9pt" textColor="#000000" textPrintColorNumber="1"/></text:ptFontInfo></text:stringItem></text:text><text:text><pt:objectStyle x="${hasLogo ? '50pt' : '10.4pt'}" y="24.4pt" width="${hasLogo ? '100pt' : '140pt'}" height="18pt" backColor="#FFFFFF" backPrintColorNumber="0" ropMode="COPYPEN" angle="0" anchor="TOPLEFT" flip="NONE"><pt:pen style="NULL" widthX="0.5pt" widthY="0.5pt" color="#000000" printColorNumber="1"/><pt:brush style="NULL" color="#000000" printColorNumber="1" id="0"/><pt:expanded objectName="QRCodeValue" ID="0" lock="0" templateMergeTarget="LABELLIST" templateMergeType="NONE" templateMergeID="0" linkStatus="NONE" linkID="0"/></pt:objectStyle><text:ptFontInfo><text:logFont name="Arial" width="0" italic="false" weight="400" charSet="0" pitchAndFamily="34"/><text:fontExt effect="NOEFFECT" underline="0" strikeout="0" size="7pt" orgSize="7pt" textColor="#000000" textPrintColorNumber="1"/></text:ptFontInfo><text:textControl control="FREE" clipFrame="false" aspectNormal="false" shrink="true" autoLF="false" avoidImage="false"/><text:textAlign horizontalAlignment="LEFT" verticalAlignment="CENTER" inLineAlignment="BASELINE"/><text:textStyle vertical="false" nullBlock="false" charSpace="0" lineSpace="0" orgPoint="7pt" combinedChars="false"/><pt:data>${escapedQrValue}</pt:data><text:stringItem charLen="${qrCodeValue.length}"><text:ptFontInfo><text:logFont name="Arial" width="0" italic="false" weight="400" charSet="0" pitchAndFamily="34"/><text:fontExt effect="NOEFFECT" underline="0" strikeout="0" size="7pt" orgSize="7pt" textColor="#000000" textPrintColorNumber="1"/></text:ptFontInfo></text:stringItem></text:text>${hasLogo ? `<image:image><pt:objectStyle x="10.4pt" y="22.4pt" width="36pt" height="36pt" backColor="#FFFFFF" backPrintColorNumber="0" ropMode="COPYPEN" angle="0" anchor="TOPLEFT" flip="NONE"><pt:pen style="NULL" widthX="0.5pt" widthY="0.5pt" color="#000000" printColorNumber="1"/><pt:brush style="NULL" color="#000000" printColorNumber="1" id="0"/><pt:expanded objectName="Logo" ID="0" lock="0" templateMergeTarget="LABELLIST" templateMergeType="NONE" templateMergeID="0" linkStatus="NONE" linkID="0"/></pt:objectStyle><image:imageStyle originalName="logo.png" alignInText="LEFT" firstMerge="true" fileName="Object1.bmp"><image:transparent flag="false" color="#FFFFFF"/><image:trimming flag="false" shape="RECTANGLE" trimOrgX="0pt" trimOrgY="0pt" trimOrgWidth="36pt" trimOrgHeight="36pt"/><image:orgPos x="10.4pt" y="22.4pt" width="36pt" height="36pt"/><image:effect effect="NONE" brightness="50" contrast="50" photoIndex="4"/><image:mono operationKind="BINARY" reverse="0" ditherKind="MESH" threshold="128" gamma="100" ditherEdge="0" rgbconvProportionRed="30" rgbconvProportionGreen="59" rgbconvProportionBlue="11" rgbconvProportionReversed="0"/></image:imageStyle></image:image>` : ''}<image:image><pt:objectStyle x="156.4pt" y="8.4pt" width="54pt" height="54pt" backColor="#FFFFFF" backPrintColorNumber="0" ropMode="COPYPEN" angle="0" anchor="TOPLEFT" flip="NONE"><pt:pen style="NULL" widthX="0.5pt" widthY="0.5pt" color="#000000" printColorNumber="1"/><pt:brush style="NULL" color="#000000" printColorNumber="1" id="0"/><pt:expanded objectName="QRCode" ID="0" lock="0" templateMergeTarget="LABELLIST" templateMergeType="NONE" templateMergeID="0" linkStatus="NONE" linkID="0"/></pt:objectStyle><image:imageStyle originalName="qrcode.png" alignInText="LEFT" firstMerge="true" fileName="Object0.bmp"><image:transparent flag="false" color="#FFFFFF"/><image:trimming flag="false" shape="RECTANGLE" trimOrgX="0pt" trimOrgY="0pt" trimOrgWidth="54pt" trimOrgHeight="54pt"/><image:orgPos x="156.4pt" y="8.4pt" width="54pt" height="54pt"/><image:effect effect="NONE" brightness="50" contrast="50" photoIndex="4"/><image:mono operationKind="BINARY" reverse="0" ditherKind="MESH" threshold="128" gamma="100" ditherEdge="0" rgbconvProportionRed="30" rgbconvProportionGreen="59" rgbconvProportionBlue="11" rgbconvProportionReversed="0"/></image:imageStyle></image:image></pt:objects></style:sheet></pt:body></pt:document>`;
}

// Generate the prop.xml content in Brother P-Touch format
function generatePropXml(): string {
  const now = new Date();
  const isoDate = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

  return `<?xml version="1.0" encoding="UTF-8"?><meta:properties xmlns:meta="http://schemas.brother.info/ptouch/2007/lbx/meta" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><meta:appName>P-touch Editor</meta:appName><dc:title></dc:title><dc:subject></dc:subject><dc:creator>IT Asset Manager</dc:creator><meta:keyword></meta:keyword><dc:description></dc:description><meta:template></meta:template><dcterms:created>${isoDate}</dcterms:created><dcterms:modified>${isoDate}</dcterms:modified><meta:lastPrinted>${isoDate}</meta:lastPrinted><meta:modifiedBy>IT Asset Manager</meta:modifiedBy><meta:revision>1</meta:revision><meta:editTime>0</meta:editTime><meta:numPages>1</meta:numPages><meta:numWords>0</meta:numWords><meta:numChars>0</meta:numChars><meta:security>0</meta:security></meta:properties>`;
}

export async function generateLbxFile(params: LbxGeneratorParams): Promise<Buffer> {
  const { deviceName, qrCodeValue, logo } = params;

  // Create a pass-through stream to collect the ZIP data
  const passThrough = new PassThrough();
  const chunks: Buffer[] = [];

  passThrough.on('data', (chunk) => chunks.push(chunk));

  // Create ZIP archive (store method, no compression - as Brother expects)
  const archive = archiver('zip', {
    zlib: { level: 0 } // No compression
  });

  archive.pipe(passThrough);

  // Generate QR code BMP (Object0.bmp)
  const qrCodeBmp = await generateQrCodeBmp(qrCodeValue, 150);
  archive.append(qrCodeBmp, { name: 'Object0.bmp' });

  // Generate logo BMP if provided (Object1.bmp)
  const hasLogo = !!logo;
  if (logo) {
    try {
      const logoBmp = await generateLogoBmp(logo, 100);
      archive.append(logoBmp, { name: 'Object1.bmp' });
    } catch (error) {
      console.error('Error processing logo:', error);
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
    archive.on('error', reject);
  });
}

export type { LbxGeneratorParams };
