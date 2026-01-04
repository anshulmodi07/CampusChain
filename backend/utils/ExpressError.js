class ExpressError extends Error {
  constructor(status, message) {
    super(message);       // sets err.message
    this.status = status; // HTTP status code
  }
}

export default ExpressError;