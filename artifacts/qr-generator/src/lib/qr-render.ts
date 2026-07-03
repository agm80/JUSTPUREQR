import QRCode from 'qrcode';

export type DotStyle = 'square' | 'rounded';
export type CornerStyle = 'square' | 'rounded';

export interface QROptions {
  size: number;
  margin: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  color: {
    dark: string;
    light: string;
  };
  dotStyle?: DotStyle;
  cornerStyle?: CornerStyle;
  gradient?: {
    enabled: boolean;
    color1: string;
    color2: string;
    type: 'linear-horizontal' | 'linear-vertical' | 'linear-diagonal' | 'radial';
  };
  logo?: {
    src: string; // data URL or URL
    size: number; // 0 to 1
  };
}

export async function renderQRToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: QROptions
): Promise<void> {
  if (!text) return;
  
  // Need to force 'H' if logo is present
  const errorCorrectionLevel = options.logo?.src ? 'H' : options.errorCorrectionLevel;

  // Generate QR code matrix manually
  const qr = QRCode.create(text, { errorCorrectionLevel });
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not get canvas context");

  const size = options.size;
  canvas.width = size;
  canvas.height = size;

  const marginModules = options.margin;
  const moduleCount = qr.modules.size;
  const totalModules = moduleCount + marginModules * 2;
  const moduleSize = size / totalModules;

  // Fill background
  ctx.fillStyle = options.color.light;
  ctx.fillRect(0, 0, size, size);

  // Setup gradient or solid color
  let fillStyle: string | CanvasGradient = options.color.dark;
  if (options.gradient?.enabled) {
    const { type, color1, color2 } = options.gradient;
    let grad: CanvasGradient;
    const marginSize = marginModules * moduleSize;
    const innerSize = size - (marginSize * 2);
    
    if (type === 'linear-horizontal') {
      grad = ctx.createLinearGradient(marginSize, 0, size - marginSize, 0);
    } else if (type === 'linear-vertical') {
      grad = ctx.createLinearGradient(0, marginSize, 0, size - marginSize);
    } else if (type === 'linear-diagonal') {
      grad = ctx.createLinearGradient(marginSize, marginSize, size - marginSize, size - marginSize);
    } else { // radial
      const center = size / 2;
      const radius = innerSize / 2;
      grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
    }
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    fillStyle = grad;
  }

  const dotStyle: DotStyle = options.dotStyle ?? 'square';
  const cornerStyle: CornerStyle = options.cornerStyle ?? 'square';

  const isFinder = (row: number, col: number) =>
    (row < 7 && col < 7) ||
    (row < 7 && col >= moduleCount - 7) ||
    (row >= moduleCount - 7 && col < 7);

  // Draw data modules (skip finder pattern; we draw it as a single shape)
  ctx.fillStyle = fillStyle;
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (isFinder(row, col)) continue;
      if (!qr.modules.get(row, col)) continue;

      const x = (col + marginModules) * moduleSize;
      const y = (row + marginModules) * moduleSize;

      if (dotStyle === 'rounded') {
        const r = moduleSize / 2;
        ctx.beginPath();
        ctx.arc(x + r, y + r, r * 0.95, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Small tweak to prevent gaps due to antialiasing
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(moduleSize), Math.ceil(moduleSize));
      }
    }
  }

  // Draw the 3 finder patterns (corner squares)
  const drawFinder = (gridRow: number, gridCol: number) => {
    const x = (gridCol + marginModules) * moduleSize;
    const y = (gridRow + marginModules) * moduleSize;
    const r1 = cornerStyle === 'rounded' ? 1.75 * moduleSize : 0;
    const r2 = cornerStyle === 'rounded' ? 1.25 * moduleSize : 0;
    const r3 = cornerStyle === 'rounded' ? 0.75 * moduleSize : 0;

    // Outer 7x7 dark square
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.roundRect(x, y, 7 * moduleSize, 7 * moduleSize, r1);
    ctx.fill();

    // Inner 5x5 background "hole"
    ctx.fillStyle = options.color.light;
    ctx.beginPath();
    ctx.roundRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize, r2);
    ctx.fill();

    // Center 3x3 dark square
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.roundRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize, r3);
    ctx.fill();
  };

  drawFinder(0, 0);
  drawFinder(0, moduleCount - 7);
  drawFinder(moduleCount - 7, 0);

  // Draw logo if present
  const logo = options.logo;
  if (logo?.src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const logoRatio = logo.size || 0.2;
        const logoSize = size * logoRatio;
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;

        ctx.fillStyle = options.color.light;
        const bgPadding = logoSize * 0.1;

        ctx.beginPath();
        ctx.roundRect(
          logoX - bgPadding,
          logoY - bgPadding,
          logoSize + bgPadding * 2,
          logoSize + bgPadding * 2,
          logoSize * 0.1
        );
        ctx.fill();

        ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
        resolve();
      };
      img.onerror = reject;
      img.src = logo.src;
    });
  }
}
