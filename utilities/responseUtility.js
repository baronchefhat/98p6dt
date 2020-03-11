module.exports = class ResponseUtility {
  static error(error) { return {status: 'error', message: error.message}; }
  static success(data) { return data; }
};
