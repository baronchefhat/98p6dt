const _ = require('lodash');
const async = require('async');

module.exports = class InputUtility {
  static validateInput(fieldName, providedVal, requiredType, cb) {
    switch (requiredType) {
      case 'nonEmptyString': {
        return InputUtility.validatenonEmptyString(fieldName, providedVal, cb);
      }
      case 'id': {
        return InputUtility.validateId(fieldName, providedVal, cb);
      }
      case 'int': {
        return InputUtility.validateInt(fieldName, providedVal, cb);
      }
      case 'nonEmptyArray': {
        return InputUtility.validatenonEmptyArray(fieldName, providedVal, cb);
      }
      default: {
        let msg = `Unrecognized required type ${requiredType} for param ${fieldName}`;
        return cb(new Error(msg));
      }
    }
  }

  static validateId(fieldName, providedVal, cb) {
    let msg = `${fieldName} must be a valid id`;
    if (_.isInteger(providedVal)) {
      if (!_.isFinite(providedVal)) return cb(new Error(msg));
      if (providedVal >= 1) return cb();
      return cb(new Error(msg));
    } else {
      if (_.isEmpty(providedVal)) return cb(new Error(msg));
      if (!_.isString(providedVal)) return cb(new Error(msg));
      if (/^\d+$/.test(providedVal)) return cb();
      return cb(new Error(msg));
    }
  }

  static validatenonEmptyString(fieldName, providedVal, cb) {
    async.waterfall([
      (callback) => { InputUtility.validateString(fieldName, providedVal, callback); },
      (callback) => { InputUtility.validateNotEmpty(fieldName, providedVal, callback); }
    ], cb);
  }

  static validatenonEmptyArray(fieldName, providedVal, cb) {
    async.waterfall([
      (callback) => { InputUtility.validateArray(fieldName, providedVal, callback); },
      (callback) => { InputUtility.validateNotEmpty(fieldName, providedVal, callback); }
    ], cb);
  }

  static validateString(fieldName, providedVal, cb) {
    if (_.isString(providedVal)) return cb();
    return cb(new Error(`${fieldName} must be a string`));
  }

  static validateInt(fieldName, providedVal, cb) {
    if (_.isInteger(providedVal)) return cb();
    return cb(new Error(`${fieldName} must be an integer`));
  }

  static validateArray(fieldName, providedVal, cb) {
    if (_.isArray(providedVal)) return cb();
    return cb(new Error(`${fieldName} must be an array`));
  }

  static validateNotEmpty(fieldName, providedVal, cb) {
    if (!_.isEmpty(providedVal)) return cb();
    return cb(new Error(`${fieldName} cannot be empty`));
  }
};
