class LegalWorkflowError extends Error {
  constructor(code, message, status = 400, details) {
    super(message);
    this.name = 'LegalWorkflowError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  payload() {
    const result = { error: this.message, code: this.code };
    if (this.details !== undefined) result.details = this.details;
    return result;
  }
}

module.exports = { LegalWorkflowError };
