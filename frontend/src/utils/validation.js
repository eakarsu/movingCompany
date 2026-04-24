/**
 * Validation rules for form fields
 */
export const validators = {
  required: (value) => {
    if (value === null || value === undefined || String(value).trim() === '') {
      return 'This field is required';
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
    if (!phoneRegex.test(value)) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  minLength: (min) => (value) => {
    if (!value) return null;
    if (String(value).length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (!value) return null;
    if (String(value).length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  },

  zipCode: (value) => {
    if (!value) return null;
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(value)) {
      return 'Please enter a valid ZIP code';
    }
    return null;
  },

  number: (value) => {
    if (!value && value !== 0) return null;
    if (isNaN(Number(value))) {
      return 'Must be a valid number';
    }
    return null;
  },

  positiveNumber: (value) => {
    if (!value && value !== 0) return null;
    if (isNaN(Number(value)) || Number(value) < 0) {
      return 'Must be a positive number';
    }
    return null;
  },

  password: (value) => {
    if (!value) return null;
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter';
    if (!/\d/.test(value)) return 'Password must contain a number';
    return null;
  },

  date: (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Please enter a valid date';
    }
    return null;
  },

  futureDate: (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Please enter a valid date';
    if (date <= new Date()) return 'Date must be in the future';
    return null;
  },
};

/**
 * Validate a form data object against a schema of rules
 * @param {Object} data - Form data
 * @param {Object} schema - Object mapping field names to arrays of validator functions
 * @returns {{ isValid: boolean, errors: Object }}
 */
export function validateForm(data, schema) {
  const errors = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const error = rule(data[field]);
      if (error) {
        errors[field] = error;
        isValid = false;
        break;
      }
    }
  }

  return { isValid, errors };
}

/**
 * Hook-compatible field error display
 */
export function getFieldError(errors, field) {
  return errors[field] || null;
}
