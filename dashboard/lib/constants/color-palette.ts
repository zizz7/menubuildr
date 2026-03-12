// Default color palette for theme customization
export interface ColorPaletteItem {
  name: string;
  pantone: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  cmyk: { c: number; m: number; y: number; k: number };
}

export const DEFAULT_COLOR_PALETTE: ColorPaletteItem[] = [
  {
    name: 'Pure White',
    pantone: '000 C',
    hex: '#FFFFFF',
    rgb: { r: 255, g: 255, b: 255 },
    cmyk: { c: 0, m: 0, y: 0, k: 0 },
  },
  {
    name: 'Sunset Orange',
    pantone: '1565 C',
    hex: '#FFA168',
    rgb: { r: 255, g: 161, b: 104 },
    cmyk: { c: 0, m: 45, y: 61, k: 0 },
  },
  {
    name: 'Freedom Pink',
    pantone: '1905 C',
    hex: '#F89ABA',
    rgb: { r: 248, g: 154, b: 186 },
    cmyk: { c: 0, m: 50, y: 4, k: 0 },
  },
  {
    name: 'Coral Teal',
    pantone: '3265 C',
    hex: '#00C4B3',
    rgb: { r: 0, g: 196, b: 179 },
    cmyk: { c: 83, m: 0, y: 42, k: 0 },
  },
  {
    name: 'Breezy Blue',
    pantone: '291 C',
    hex: '#97CAEB',
    rgb: { r: 151, g: 202, b: 235 },
    cmyk: { c: 38, m: 8, y: 1, k: 0 },
  },
  {
    name: 'Black',
    pantone: 'BLACK C',
    hex: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
    cmyk: { c: 0, m: 0, y: 0, k: 100 },
  },
];

// Helper function to get color by name
export function getColorByName(name: string): ColorPaletteItem | undefined {
  return DEFAULT_COLOR_PALETTE.find((color) => color.name === name);
}

// Helper function to get color by hex
export function getColorByHex(hex: string): ColorPaletteItem | undefined {
  return DEFAULT_COLOR_PALETTE.find((color) => color.hex.toUpperCase() === hex.toUpperCase());
}

