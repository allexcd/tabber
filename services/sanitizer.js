// Data Sanitization Service
// Removes sensitive information from tab data before sending to AI providers

export class Sanitizer {
  constructor(options = {}) {
    this.options = {
      removeEmails: true,
      removePhoneNumbers: true,
      removeAccountNumbers: true,
      removeCreditCards: true,
      removeSSN: true,
      removeIPAddresses: true,
      customPatterns: [],
      ...options,
    };

    // Built-in patterns for sensitive data
    this.patterns = {
      email: {
        regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        replacement: '[EMAIL]',
      },
      phone: {
        regex: /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,
        replacement: '[PHONE]',
      },
      accountNumber: {
        regex: /\b\d{8,16}\b/g,
        replacement: '[ACCOUNT]',
      },
      creditCard: {
        regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        replacement: '[CARD]',
      },
      ssn: {
        regex: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
        replacement: '[SSN]',
      },
      ipAddress: {
        regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        replacement: '[IP]',
      },
    };
  }

  // Sanitize a string by removing sensitive patterns
  sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let sanitized = text;

    // Apply built-in patterns based on options
    if (this.options.removeEmails) {
      sanitized = sanitized.replace(this.patterns.email.regex, this.patterns.email.replacement);
    }
    if (this.options.removePhoneNumbers) {
      sanitized = sanitized.replace(this.patterns.phone.regex, this.patterns.phone.replacement);
    }
    if (this.options.removeAccountNumbers) {
      sanitized = sanitized.replace(
        this.patterns.accountNumber.regex,
        this.patterns.accountNumber.replacement
      );
    }
    if (this.options.removeCreditCards) {
      sanitized = sanitized.replace(
        this.patterns.creditCard.regex,
        this.patterns.creditCard.replacement
      );
    }
    if (this.options.removeSSN) {
      sanitized = sanitized.replace(this.patterns.ssn.regex, this.patterns.ssn.replacement);
    }
    if (this.options.removeIPAddresses) {
      sanitized = sanitized.replace(
        this.patterns.ipAddress.regex,
        this.patterns.ipAddress.replacement
      );
    }

    // Apply custom patterns
    for (const pattern of this.options.customPatterns) {
      if (pattern.regex && pattern.replacement) {
        sanitized = sanitized.replace(pattern.regex, pattern.replacement);
      }
    }

    return sanitized;
  }

  // Sanitize URL by removing sensitive query parameters
  sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
      return url;
    }

    try {
      const urlObj = new URL(url);

      // Sensitive query parameter names to remove
      const sensitiveParams = [
        'token',
        'key',
        'apikey',
        'api_key',
        'password',
        'pwd',
        'pass',
        'secret',
        'auth',
        'session',
        'sessionid',
        'session_id',
        'access_token',
        'refresh_token',
        'bearer',
        'account',
        'accountid',
        'account_id',
        'ssn',
        'social',
        'credit',
        'card',
        'email',
        'phone',
        'mobile',
      ];

      // Remove sensitive query parameters
      sensitiveParams.forEach((param) => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });

      // Also sanitize the pathname for potential sensitive data
      const sanitizedPath = this.sanitizeText(urlObj.pathname);

      // Return simplified URL: just origin + sanitized path
      return `${urlObj.origin}${sanitizedPath}`;
    } catch (error) {
      // If URL parsing fails, just sanitize as text
      return this.sanitizeText(url);
    }
  }

  // Sanitize both title and URL for tab processing
  sanitizeTabData(title, url) {
    return {
      title: this.sanitizeText(title),
      url: this.sanitizeUrl(url),
    };
  }

  // Add a custom pattern at runtime
  addPattern(name, regex, replacement) {
    this.patterns[name] = { regex, replacement };
  }

  // Enable/disable specific sanitization
  setOption(optionName, value) {
    if (optionName in this.options) {
      this.options[optionName] = value;
    }
  }
}

// Export singleton instance with default options
export const sanitizer = new Sanitizer();
