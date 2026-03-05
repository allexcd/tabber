export const TAB_GROUP_TITLE_RENDER_BUG_CHROMIUM_MAJOR = 145;
export const TAB_GROUP_TITLE_RENDER_FIX_CHROMIUM_MAJOR = 146;
export const TAB_GROUP_TITLE_RENDER_FIXED_VERSION_LABEL =
  'Chromium 146+ (Chrome 146+, Brave 1.88+)';

const CHROMIUM_BRAND_PATTERN = /chromium|chrome|brave|edge|opera|vivaldi/i;
const CHROMIUM_UA_PATTERN =
  /(Chrome|Chromium|HeadlessChrome|Brave|Edg|OPR|Vivaldi)\/(\d+(?:\.\d+)*)/i;

export function detectBrowserInfo(options = {}) {
  const nav = globalThis.navigator || {};
  const userAgent = typeof options.userAgent === 'string' ? options.userAgent : nav.userAgent || '';
  const userAgentData = options.userAgentData ?? nav.userAgentData;
  const brands = Array.isArray(userAgentData?.brands) ? userAgentData.brands : [];

  const chromiumMajor =
    detectChromiumMajorFromBrands(brands) ?? detectChromiumMajorFromUserAgent(userAgent);
  const browserName = detectBrowserName(brands, userAgent);
  const browserVersion = detectBrowserVersion(brands, userAgent, browserName);
  const isChromiumBased =
    chromiumMajor !== null ||
    brands.some((brand) => CHROMIUM_BRAND_PATTERN.test(brand?.brand || '')) ||
    CHROMIUM_UA_PATTERN.test(userAgent);

  return {
    browserName,
    browserVersion,
    chromiumMajor,
    isChromiumBased,
    isAffectedTabGroupLabelBug:
      isChromiumBased && chromiumMajor === TAB_GROUP_TITLE_RENDER_BUG_CHROMIUM_MAJOR,
    fixAvailableFromChromiumMajor: TAB_GROUP_TITLE_RENDER_FIX_CHROMIUM_MAJOR,
    fixedVersionLabel: TAB_GROUP_TITLE_RENDER_FIXED_VERSION_LABEL,
  };
}

function detectChromiumMajorFromBrands(brands) {
  for (const entry of brands) {
    const brandName = entry?.brand || '';
    if (!CHROMIUM_BRAND_PATTERN.test(brandName)) {
      continue;
    }

    const major = parseMajorVersion(entry?.version);
    if (major !== null) {
      return major;
    }
  }

  return null;
}

function detectChromiumMajorFromUserAgent(userAgent) {
  const match = String(userAgent || '').match(CHROMIUM_UA_PATTERN);
  return parseMajorVersion(match?.[2]);
}

function detectBrowserName(brands, userAgent) {
  const findBrand = (pattern) =>
    brands.find((entry) => pattern.test(entry?.brand || ''))?.brand || null;

  if (findBrand(/brave/i) || /Brave\//i.test(userAgent)) {
    return 'Brave';
  }
  if (findBrand(/edge/i) || /Edg\//i.test(userAgent)) {
    return 'Edge';
  }
  if (findBrand(/opera/i) || /OPR\//i.test(userAgent)) {
    return 'Opera';
  }
  if (findBrand(/vivaldi/i) || /Vivaldi\//i.test(userAgent)) {
    return 'Vivaldi';
  }
  if (findBrand(/google chrome|chrome/i) || /Chrome\//i.test(userAgent)) {
    return 'Chrome';
  }
  if (findBrand(/chromium/i) || /Chromium\//i.test(userAgent)) {
    return 'Chromium';
  }

  return 'Unknown';
}

function detectBrowserVersion(brands, userAgent, browserName) {
  const brandMatchers = {
    Brave: /brave/i,
    Edge: /edge/i,
    Opera: /opera/i,
    Vivaldi: /vivaldi/i,
    Chrome: /google chrome|chrome/i,
    Chromium: /chromium/i,
  };

  const brandMatcher = brandMatchers[browserName];
  if (brandMatcher) {
    const fromBrand = brands.find((entry) => brandMatcher.test(entry?.brand || ''))?.version || '';
    if (fromBrand) {
      return fromBrand;
    }
  }

  const uaMatchers = {
    Brave: /Brave\/([\d.]+)/i,
    Edge: /Edg\/([\d.]+)/i,
    Opera: /OPR\/([\d.]+)/i,
    Vivaldi: /Vivaldi\/([\d.]+)/i,
    Chrome: /(?:Chrome|HeadlessChrome)\/([\d.]+)/i,
    Chromium: /Chromium\/([\d.]+)/i,
  };
  const match = String(userAgent || '').match(uaMatchers[browserName] || /$^/);
  if (match?.[1]) {
    return match[1];
  }

  const major = detectChromiumMajorFromUserAgent(userAgent);
  return major === null ? '' : String(major);
}

function parseMajorVersion(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const major = Number.parseInt(String(value).split('.')[0], 10);
  return Number.isInteger(major) ? major : null;
}
