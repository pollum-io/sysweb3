const camelCaseToDash = (string) => {
  return string.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
};

const dashToCamelCase = (string) => {
  return string.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};

const toUpperCase = (string) => {
  return `${string.charAt(0).toUpperCase()}${string.substring(1)}`;
};

const pascalCase = (string) => {
  return toUpperCase(dashToCamelCase(string));
};

const normalizePackageName = (rawPackageName) => {
  const scopeEnd = rawPackageName.indexOf('/') + 1;

  return rawPackageName.substring(scopeEnd);
};

const getOutputFileName = (fileName, isProd = false) => {
  return isProd ? fileName.replace(/\.js$/, '.min.js') : fileName;
};

module.exports = {
  camelCaseToDash,
  dashToCamelCase,
  toUpperCase,
  pascalCase,
  normalizePackageName,
  getOutputFileName,
};
