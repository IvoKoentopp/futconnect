// Core-js polyfills
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Specific polyfills for iOS 12
if (!Object.fromEntries) {
  Object.fromEntries = function fromEntries(entries: any) {
    const obj: any = {};
    for (const [key, value] of entries) {
      obj[key] = value;
    }
    return obj;
  };
}

// Add other polyfills as needed
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(
    searchValue: string | RegExp,
    replaceValue: any
  ): string {
    // Se for uma RegExp
    if (searchValue instanceof RegExp) {
      return this.replace(searchValue, replaceValue);
    }
    // Se for uma string
    return this.replace(
      new RegExp(searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      replaceValue
    );
  };
}

// Array.prototype.at polyfill
if (!Array.prototype.at) {
  Array.prototype.at = function(index: number) {
    index = Math.trunc(index) || 0;
    if (index < 0) index += this.length;
    if (index < 0 || index >= this.length) return undefined;
    return this[index];
  };
}
