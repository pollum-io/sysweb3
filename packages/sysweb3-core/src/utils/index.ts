export function parseJsonRecursively(jsonString: string) {
  try {
    const parsed = JSON.parse(jsonString);

    if (typeof parsed === 'object' && parsed !== null) {
      Object.keys(parsed).forEach((key) => {
        if (typeof parsed[key] === 'string') {
          parsed[key] = parseJsonRecursively(parsed[key]);
        }
      });
    }

    return parsed;
  } catch (error) {
    // if not a valid JSON, return the param
    return jsonString;
  }
}
