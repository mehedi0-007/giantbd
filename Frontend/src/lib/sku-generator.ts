/**
 * Intelligent Deterministic SKU & Code Auto-Generation Engine for Giant BD ERP
 */

/**
 * Clean and extract a 2-4 letter abbreviation from a string name
 */
export function extractAbbreviation(name: string, maxLen = 3): string {
  if (!name || !name.trim()) return '';

  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    // If multiple words (e.g. "Running Shoes"), take initials (e.g. "RS")
    const initials = words.map((w) => w[0].toUpperCase()).join('');
    return initials.slice(0, maxLen);
  }

  // If single word (e.g. "Footwear"), take first letters without vowels if long
  if (clean.length <= maxLen) return clean.toUpperCase();

  const consonants = clean.replace(/[aeiouAEIOU]/g, '');
  if (consonants.length >= maxLen) {
    return consonants.slice(0, maxLen).toUpperCase();
  }

  return clean.slice(0, maxLen).toUpperCase();
}

/**
 * Generate Master Product SKU
 * Format: [CAT]-[SUBCAT]-[NAME_ACRONYM]-[YEAR]
 * Example: FTW-RUN-AFV-26
 */
export function generateMasterProductSku(
  name: string,
  categoryName?: string,
  subCategoryName?: string,
): string {
  const parts: string[] = [];

  // Category Code (e.g. Footwear -> FTW)
  if (categoryName) {
    parts.push(extractAbbreviation(categoryName, 3));
  }

  // Sub-Category Code (e.g. Running Shoes -> RUN)
  if (subCategoryName) {
    parts.push(extractAbbreviation(subCategoryName, 3));
  }

  // Product Style Name Acronym (e.g. Air Flow Velocity -> AFV)
  if (name) {
    parts.push(extractAbbreviation(name, 3));
  }

  // Year (e.g. 2026 -> 26)
  const currentYear = new Date().getFullYear().toString().slice(-2);
  parts.push(currentYear);

  return parts.filter(Boolean).join('-');
}

/**
 * Generate Variant Product SKU
 * Format: [MasterSKU]-[COLOR]-[GENDER]-[SIZE]
 * Example: FTW-RUN-AFV-26-NVY-M-42
 */
export function generateVariantSku(
  masterSku: string,
  colorName: string,
  gender: string,
  size: string,
): string {
  const prefix = (masterSku || 'SKU').trim().toUpperCase();
  const colorCode = extractAbbreviation(colorName, 3) || 'CLR';
  const genderCode = (gender?.[0] || 'U').toUpperCase();
  const cleanSize = (size || '00').trim().toUpperCase();

  return `${prefix}-${colorCode}-${genderCode}-${cleanSize}`;
}

/**
 * Generate Warehouse Code
 * Example: "Central Warehouse" -> "WH-CW" or "WH01"
 */
export function generateWarehouseCode(name: string): string {
  if (!name.trim()) return 'WH';
  const abbr = extractAbbreviation(name, 3);
  return `WH-${abbr}`;
}

/**
 * Generate Zone Code
 * Example: WH01 + "Alpha Zone" -> "ZA"
 */
export function generateZoneCode(zoneName: string): string {
  if (!zoneName.trim()) return 'ZA';
  const abbr = extractAbbreviation(zoneName, 2);
  return `Z${abbr}`;
}

/**
 * Generate SubZone Code
 * Example: "SubZone 1" -> "SZ01"
 */
export function generateSubZoneCode(subZoneName: string): string {
  if (!subZoneName.trim()) return 'SZ1';
  const abbr = extractAbbreviation(subZoneName, 3);
  return `S${abbr}`;
}

/**
 * Generate Rack Code
 * Example: "Tier 1 Rack" -> "R01"
 */
export function generateRackCode(rackName: string): string {
  if (!rackName.trim()) return 'R01';
  const abbr = extractAbbreviation(rackName, 3);
  return `R${abbr}`;
}

/**
 * Generate Location / Bin Code (Code 128 format)
 * Example: WH1-ZA-SZ1-R01
 */
export function generateLocationBarcode(
  warehouseCode?: string,
  zoneCode?: string,
  subZoneCode?: string,
  rackCode?: string,
): string {
  const parts = [
    warehouseCode || 'WH',
    zoneCode || 'ZA',
    subZoneCode || 'SZ',
    rackCode || 'R1',
  ];
  return parts.join('-');
}
