import { Platform, Dimensions } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import type { ClientTools } from '@elevenlabs/react-native';

/**
 * Example Client Tools for ElevenLabs React Native SDK
 *
 * These tools demonstrate how to create client-side functions that can be
 * invoked by the AI agent during conversations. Each tool should:
 *
 * 1. Have a descriptive name that the agent can understand
 * 2. Accept parameters as a Record<string, unknown>
 * 3. Return a string, number, or undefined
 * 4. Handle errors gracefully
 * 5. Provide meaningful feedback to the agent
 */

/**
 * Device Information Tools
 */
export const deviceTools: ClientTools = {
  /**
   * Get basic device information
   */
  get_device_info: async (): Promise<string> => {
    const { width, height } = Dimensions.get('window');
    const scale = Dimensions.get('window').scale;

    const deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version,
      screenDimensions: { width, height, scale },
      isTablet: (Platform.OS === 'ios' && (width > 768 || height > 768)) ||
                (Platform.OS === 'android' && (width > 600 || height > 600)),
    };

    return `Device: ${Platform.OS} ${Platform.Version}, Screen: ${width}x${height} (${scale}x), Type: ${deviceInfo.isTablet ? 'Tablet' : 'Phone'}`;
  },

  /**
   * Get current screen orientation and dimensions
   */
  get_screen_info: async (): Promise<string> => {
    const window = Dimensions.get('window');
    const screen = Dimensions.get('screen');

    const orientation = window.width > window.height ? 'landscape' : 'portrait';

    return `Screen: ${screen.width}x${screen.height}, Window: ${window.width}x${window.height}, Orientation: ${orientation}`;
  },
};

/**
 * Time and Date Tools
 */
export const timeTools: ClientTools = {
  /**
   * Get current time in various formats
   */
  get_current_time: async (params: Record<string, unknown>): Promise<string> => {
    const format = params.format as string || 'local';
    const now = new Date();

    switch (format.toLowerCase()) {
      case 'utc':
        return now.toUTCString();
      case 'iso':
        return now.toISOString();
      case 'timestamp':
        return now.getTime().toString();
      case 'local':
        return now.toLocaleString();
      default:
        return now.toLocaleString();
    }
  },

  /**
   * Get current timezone information
   */
  get_timezone_info: async (): Promise<string> => {
    const now = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = -now.getTimezoneOffset();
    const offsetHours = Math.floor(offset / 60);
    const offsetMinutes = offset % 60;

    return `Timezone: ${timeZone}, Offset: UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}:${offsetMinutes.toString().padStart(2, '0')}`;
  },

  /**
   * Calculate time difference between dates
   */
  calculate_time_difference: async (params: Record<string, unknown>): Promise<string> => {
    try {
      const startDate = params.start_date as string;
      const endDate = params.end_date as string;
      const unit = params.unit as string || 'minutes';

      if (!startDate || !endDate) {
        return 'Error: Both start_date and end_date are required';
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 'Error: Invalid date format. Use ISO format like 2024-01-01T10:00:00Z';
      }

      const diffMs = end.getTime() - start.getTime();

      switch (unit.toLowerCase()) {
        case 'seconds':
          return `${Math.round(diffMs / 1000)} seconds`;
        case 'minutes':
          return `${Math.round(diffMs / (1000 * 60))} minutes`;
        case 'hours':
          return `${Math.round(diffMs / (1000 * 60 * 60))} hours`;
        case 'days':
          return `${Math.round(diffMs / (1000 * 60 * 60 * 24))} days`;
        default:
          return `${diffMs} milliseconds`;
      }
    } catch (error) {
      return `Error calculating time difference: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
};

/**
 * Calculation and Math Tools
 */
export const mathTools: ClientTools = {
  /**
   * Perform basic arithmetic calculations
   */
  calculate: async (params: Record<string, unknown>): Promise<string> => {
    try {
      const expression = params.expression as string;

      if (!expression) {
        return 'Error: Expression parameter is required';
      }

      // Simple safe evaluation for basic arithmetic
      // Only allow numbers, operators, and parentheses
      const safeExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');

      if (safeExpression !== expression) {
        return 'Error: Only basic arithmetic operations (+, -, *, /, parentheses) are allowed';
      }

      try {
        // Using Function constructor for safer evaluation than eval
        const result = new Function(`return ${safeExpression}`)();

        if (typeof result !== 'number' || !Number.isFinite(result)) {
          return 'Error: Calculation resulted in invalid number';
        }

        return `${expression} = ${result}`;
      } catch {
        return 'Error: Invalid mathematical expression';
      }
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  /**
   * Convert between different units
   */
  convert_units: async (params: Record<string, unknown>): Promise<string> => {
    try {
      const value = params.value as number;
      const fromUnit = params.from as string;
      const toUnit = params.to as string;

      if (typeof value !== 'number') {
        return 'Error: Value must be a number';
      }

      if (!fromUnit || !toUnit) {
        return 'Error: Both from and to units are required';
      }

            const conversions: Record<string, Record<string, (value: number) => number>> = {
        // Temperature conversions (to Celsius first, then to target)
        celsius: { fahrenheit: (c: number) => (c * 9/5) + 32, kelvin: (c: number) => c + 273.15 },
        fahrenheit: { celsius: (f: number) => (f - 32) * 5/9, kelvin: (f: number) => (f - 32) * 5/9 + 273.15 },
        kelvin: { celsius: (k: number) => k - 273.15, fahrenheit: (k: number) => (k - 273.15) * 9/5 + 32 },

        // Length conversions (to meters first)
        meters: { feet: (m: number) => m * 3.28084, inches: (m: number) => m * 39.3701, kilometers: (m: number) => m / 1000 },
        feet: { meters: (f: number) => f / 3.28084, inches: (f: number) => f * 12, kilometers: (f: number) => f / 3280.84 },
        inches: { meters: (i: number) => i / 39.3701, feet: (i: number) => i / 12, kilometers: (i: number) => i / 39370.1 },
        kilometers: { meters: (k: number) => k * 1000, feet: (k: number) => k * 3280.84, inches: (k: number) => k * 39370.1 },
      };

      const fromConversions = conversions[fromUnit.toLowerCase()];
      if (!fromConversions) {
        return `Error: Unsupported unit '${fromUnit}'. Supported: celsius, fahrenheit, kelvin, meters, feet, inches, kilometers`;
      }

      const converter = fromConversions[toUnit.toLowerCase()];
      if (!converter) {
        return `Error: Cannot convert from '${fromUnit}' to '${toUnit}'`;
      }

      const result = converter(value);
      return `${value} ${fromUnit} = ${result.toFixed(4)} ${toUnit}`;

    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
};

/**
 * Text and Clipboard Tools
 */
export const textTools: ClientTools = {
  /**
   * Copy text to clipboard
   */
  copy_to_clipboard: async (params: Record<string, unknown>): Promise<string> => {
    try {
      const text = params.text as string;

      if (!text) {
        return 'Error: Text parameter is required';
      }

      await Clipboard.setStringAsync(text);
      return `Copied "${text}" to clipboard`;
    } catch (error) {
      return `Error copying to clipboard: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  /**
   * Get text from clipboard
   */
  get_from_clipboard: async (): Promise<string> => {
    try {
      const text = await Clipboard.getStringAsync();

      if (!text) {
        return 'Clipboard is empty';
      }

      return `Clipboard content: "${text}"`;
    } catch (error) {
      return `Error reading clipboard: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  /**
   * Analyze text (word count, character count, etc.)
   */
  analyze_text: async (params: Record<string, unknown>): Promise<string> => {
    try {
      const text = params.text as string;

      if (!text) {
        return 'Error: Text parameter is required';
      }

      const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
      const charCount = text.length;
      const charCountNoSpaces = text.replace(/\s/g, '').length;
      const lineCount = text.split('\n').length;
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

      return `Text analysis: ${wordCount} words, ${charCount} characters (${charCountNoSpaces} without spaces), ${lineCount} lines, ${sentences} sentences`;
    } catch (error) {
      return `Error analyzing text: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
};

/**
 * React Native Specific Tools
 */
export const reactNativeTools: ClientTools = {
  /**
   * Trigger haptic feedback (iOS only)
   */
  trigger_haptic_feedback: async (params: Record<string, unknown>): Promise<string> => {
    try {
      if (Platform.OS !== 'ios') {
        return 'Haptic feedback is only available on iOS';
      }

      const type = params.type as string || 'medium';

      switch (type.toLowerCase()) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      return `Triggered ${type} haptic feedback`;
    } catch (error) {
      return `Error triggering haptic feedback: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  /**
   * Get app state information
   */
  get_app_state: async (): Promise<string> => {
    try {
      const { width, height } = Dimensions.get('window');
      const platform = Platform.OS;
      const version = Platform.Version;

      return `App State: Platform: ${platform} ${version}, Viewport: ${width}x${height}`;
    } catch (error) {
      return `Error getting app state: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
};

/**
 * Utility Tools for Development and Testing
 */
export const utilityTools: ClientTools = {
  /**
   * Generate random numbers
   */
  generate_random_number: async (params: Record<string, unknown>): Promise<string> => {
    try {
      const min = (params.min as number) || 0;
      const max = (params.max as number) || 100;
      const decimals = (params.decimals as number) || 0;

      if (min >= max) {
        return 'Error: Min value must be less than max value';
      }

      const random = Math.random() * (max - min) + min;
      const result = decimals > 0 ? random.toFixed(decimals) : Math.floor(random);

      return `Random number between ${min} and ${max}: ${result}`;
    } catch (error) {
      return `Error generating random number: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  /**
   * Create a simple timer/countdown
   */
  create_timer: async (params: Record<string, unknown>): Promise<string> => {
    try {
      const seconds = params.seconds as number;
      const message = params.message as string || 'Timer finished!';

      if (typeof seconds !== 'number' || seconds <= 0) {
        return 'Error: Seconds must be a positive number';
      }

      if (seconds > 300) { // 5 minutes max
        return 'Error: Timer cannot exceed 5 minutes (300 seconds)';
      }

      // Note: This is a simplified timer that just returns the setup message
      // In a real app, you might want to integrate with notifications or app state
      return `Timer set for ${seconds} seconds. Message: "${message}". Timer will execute in background.`;
    } catch (error) {
      return `Error creating timer: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  /**
   * Format JSON data for better readability
   */
  format_json: async (params: Record<string, unknown>): Promise<string> => {
    try {
      const data = params.data;

      if (!data) {
        return 'Error: Data parameter is required';
      }

      let jsonString: string;

      if (typeof data === 'string') {
        // Try to parse if it's a JSON string
        try {
          const parsed = JSON.parse(data);
          jsonString = JSON.stringify(parsed, null, 2);
        } catch {
          return 'Error: Invalid JSON string provided';
        }
      } else {
        // Format the object directly
        jsonString = JSON.stringify(data, null, 2);
      }

      return `Formatted JSON:\n${jsonString}`;
    } catch (error) {
      return `Error formatting JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
};

/**
 * Combined client tools object with all available tools
 *
 * Usage in your conversation configuration:
 *
 * ```typescript
 * const conversation = await Conversation.startSession({
 *   agentId: 'your-agent-id',
 *   clientTools: exampleClientTools,
 *   // ... other options
 * });
 * ```
 */
export const exampleClientTools: ClientTools = {
  ...deviceTools,
  ...timeTools,
  ...mathTools,
  ...textTools,
  ...reactNativeTools,
  ...utilityTools,
};

/**
 * Tool categories for easy selection
 */
export const toolCategories = {
  device: deviceTools,
  time: timeTools,
  math: mathTools,
  text: textTools,
  reactNative: reactNativeTools,
  utility: utilityTools,
  all: exampleClientTools,
};

/**
 * Tool documentation for agent training or user reference
 */
export const toolDocumentation = {
  device: {
    get_device_info: 'Returns basic device information including platform, version, and screen details',
    get_screen_info: 'Returns current screen dimensions and orientation',
  },
  time: {
    get_current_time: 'Returns current time in specified format (local, utc, iso, timestamp)',
    get_timezone_info: 'Returns current timezone and offset information',
    calculate_time_difference: 'Calculates difference between two dates in specified unit',
  },
  math: {
    calculate: 'Performs basic arithmetic calculations safely',
    convert_units: 'Converts between different units (temperature, length)',
  },
  text: {
    copy_to_clipboard: 'Copies specified text to device clipboard',
    get_from_clipboard: 'Retrieves text from device clipboard',
    analyze_text: 'Analyzes text for word count, character count, lines, and sentences',
  },
  reactNative: {
    trigger_haptic_feedback: 'Triggers haptic feedback on iOS devices (light, medium, heavy, success, warning, error)',
    get_app_state: 'Returns current app state and platform information',
  },
  utility: {
    generate_random_number: 'Generates random numbers within specified range with optional decimal places',
    create_timer: 'Creates a simple timer with custom message',
    format_json: 'Formats JSON data for better readability',
  },
};

export default exampleClientTools;