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
  String.prototype.replaceAll = function(str: string, newStr: string) {
    // If a regex pattern
    if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') { 
      return this.replace(str, newStr);
    }
    // If a string
    return this.replace(new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newStr);
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
