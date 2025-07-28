import { calculateConfigHash } from '../utils';

describe('Utils', () => {
  describe('calculateConfigHash', () => {
    it('should generate consistent hashes for the same object', () => {
      const config = { name: 'test', value: 123 };
      const hash1 = calculateConfigHash(config);
      const hash2 = calculateConfigHash(config);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(32); // MD5 hash length
    });

    it('should generate different hashes for different objects', () => {
      const config1 = { name: 'test1', value: 123 };
      const config2 = { name: 'test2', value: 123 };
      
      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate same hash regardless of key order', () => {
      const config1 = { name: 'test', value: 123, enabled: true };
      const config2 = { enabled: true, value: 123, name: 'test' };
      
      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate same hash for nested objects regardless of key order', () => {
      // This test will FAIL with the current implementation
      const config1 = {
        name: 'test',
        api_schema: {
          url: 'https://example.com',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' }
        },
        dynamic_variables: {
          dynamic_variable_placeholders: {
            var1: 'value1',
            var2: 'value2'
          }
        }
      };

      const config2 = {
        name: 'test',
        api_schema: {
          method: 'POST',  // Different order
          url: 'https://example.com',
          headers: { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' }  // Different order
        },
        dynamic_variables: {
          dynamic_variable_placeholders: {
            var2: 'value2',  // Different order
            var1: 'value1'
          }
        }
      };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);

      // This assertion will fail with current implementation
      expect(hash1).toBe(hash2);
    });
  });
}); 