import { createHash } from "crypto";
import fs from "fs-extra";
import path from "path";

/**
 * Recursively sorts object keys to ensure consistent serialization.
 *
 * @param obj - The object to sort
 * @returns A new object with recursively sorted keys
 */
function sortObjectKeysRecursively(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeysRecursively);
  }

  const sortedObj: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();

  for (const key of keys) {
    sortedObj[key] = sortObjectKeysRecursively(
      (obj as Record<string, unknown>)[key]
    );
  }

  return sortedObj;
}

/**
 * Calculates the MD5 hash of a configuration object.
 *
 * @param config - The configuration object
 * @returns The hexadecimal representation of the MD5 hash
 */
export function calculateConfigHash(config: unknown): string {
  // Recursively sort all object keys to ensure consistent hashes
  const sortedConfig = sortObjectKeysRecursively(config);
  const configString = JSON.stringify(sortedConfig);

  // Calculate MD5 hash
  const hash = createHash("md5");
  hash.update(configString, "utf-8");
  return hash.digest("hex");
}

/**
 * Reads a JSON configuration file.
 *
 * @param filePath - The path to the JSON configuration file
 * @returns A promise that resolves to the configuration object
 * @throws {Error} If the configuration file is not found or contains invalid JSON
 */
export async function readConfig<T = Record<string, unknown>>(
  filePath: string
): Promise<T> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Configuration file not found at ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in configuration file ${filePath}`);
    }
    throw error;
  }
}

/**
 * Writes a configuration object to a JSON file.
 *
 * @param filePath - The path to write the JSON configuration file
 * @param config - The configuration object to write
 * @throws {Error} If there is an error writing the file
 */
export async function writeConfig(
  filePath: string,
  config: unknown
): Promise<void> {
  try {
    // Ensure the directory exists before writing
    const directory = path.dirname(filePath);
    if (directory) {
      await fs.ensureDir(directory);
    }

    await fs.writeFile(filePath, JSON.stringify(config, null, 4), "utf-8");
  } catch (error) {
    throw new Error(
      `Could not write configuration file to ${filePath}: ${error}`
    );
  }
}

// Deep key normalization utilities

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

function toCamelCaseKey(key: string): string {
  return key.replace(/[_-]([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
}

function toSnakeCaseKey(key: string): string {
  // Convert camelCase or PascalCase to snake_case; keep existing underscores
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

export function toCamelCaseKeys<T = unknown>(value: T, skipHeaderConversion = false): T {
  if (Array.isArray(value)) {
    return (value.map((v) => toCamelCaseKeys(v, skipHeaderConversion)) as unknown) as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (skipHeaderConversion) {
        // Inside request_headers: preserve all keys as-is to avoid converting
        // header names like "X-Api-Key" or nested keys like "secret_id"
        result[k] = toCamelCaseKeys(v, true);
      } else {
        // Normal conversion
        result[toCamelCaseKey(k)] = toCamelCaseKeys(v, k === 'request_headers');
      }
    }
    return (result as unknown) as T;
  }
  return value;
}

export function toSnakeCaseKeys<T = unknown>(value: T): T {
  if (Array.isArray(value)) {
    return (value.map((v) => toSnakeCaseKeys(v)) as unknown) as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[toSnakeCaseKey(k)] = toSnakeCaseKeys(v);
    }
    return (result as unknown) as T;
  }
  return value;
}

/**
 * Sanitizes a name to be filesystem-safe
 * @param name - The name to sanitize
 * @returns A filesystem-safe name
 */
function sanitizeFilename(name: string): string {
  if (!name || name.trim().length === 0) {
    return 'unnamed';
  }

  let sanitized = name.trim();
  
  // Check if name starts with a dot before sanitization
  const startsWithDot = sanitized.startsWith('.');
  
  // Replace filesystem-unsafe characters with hyphens
  sanitized = sanitized.replace(/[/\\:*?"<>|]/g, '-');
  
  // Replace spaces with hyphens
  sanitized = sanitized.replace(/\s+/g, '-');
  
  // Replace multiple consecutive hyphens with a single hyphen
  sanitized = sanitized.replace(/-+/g, '-');
  
  // Remove leading/trailing hyphens and dots
  sanitized = sanitized.replace(/^[.-]+|[.-]+$/g, '');
  
  // If the name is now empty, use fallback
  if (sanitized.length === 0) {
    return 'unnamed';
  }
  
  // If name originally started with a dot, prefix with underscore
  if (startsWithDot) {
    sanitized = '_' + sanitized;
  }
  
  // Truncate to 100 characters to avoid extremely long filenames
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  
  return sanitized;
}

/**
 * Generates a unique filename in the specified directory.
 * If a file with the given name already exists, appends a number suffix (-1, -2, etc.)
 * 
 * @param outputDir - The directory where the file will be created
 * @param entityName - The name of the entity (agent/tool/test)
 * @param extension - The file extension (default: '.json')
 * @returns A relative path to a unique filename
 */
export async function generateUniqueFilename(
  outputDir: string,
  entityName: string,
  extension: string = '.json'
): Promise<string> {
  const sanitized = sanitizeFilename(entityName);
  let filename = `${sanitized}${extension}`;
  let filePath = path.join(outputDir, filename);
  
  // Check if file exists on disk
  if (!(await fs.pathExists(filePath))) {
    return filePath;
  }
  
  // File exists, try numbered variants
  let counter = 1;
  while (await fs.pathExists(filePath)) {
    filename = `${sanitized}-${counter}${extension}`;
    filePath = path.join(outputDir, filename);
    counter++;
  }
  
  return filePath;
}
