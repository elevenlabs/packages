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

    it('should generate different hashes for different nested content', () => {
      const config1 = {
        name: 'test',
        api_schema: {
          url: 'https://example.com',
          method: 'POST'
        }
      };

      const config2 = {
        name: 'test',
        api_schema: {
          url: 'https://totally-different.com',
          method: 'DELETE',
          extra_field: 'this should change the hash!'
        }
      };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle deeply nested objects and arrays', () => {
      const config1 = {
        tools: [
          { name: 'tool1', params: { a: 1, b: 2 } },
          { name: 'tool2', params: { x: 3, y: 4 } }
        ],
        settings: {
          nested: {
            deeply: {
              value: 'test',
              array: [3, 1, 2]
            }
          }
        }
      };

      const config2 = {
        settings: {  // Different order
          nested: {
            deeply: {
              array: [3, 1, 2],  // Same array, different position
              value: 'test'
            }
          }
        },
        tools: [
          { params: { b: 2, a: 1 }, name: 'tool1' },  // Different key order
          { params: { y: 4, x: 3 }, name: 'tool2' }   // Different key order
        ]
      };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes when deeply nested properties change', () => {
      const config1 = {
        name: 'agent',
        platform_settings: {
          widget: {
            color_scheme: 'light',
            position: {
              vertical: 'bottom',
              horizontal: 'right',
              offset: {
                x: 20,
                y: 20
              }
            }
          }
        },
        conversation_config: {
          tts: {
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.5,
              similarity: 0.75,
              style: 0.0,
              use_speaker_boost: true
            }
          }
        }
      };

      // Same structure but with different deeply nested values
      const config2 = {
        name: 'agent',
        platform_settings: {
          widget: {
            color_scheme: 'light',
            position: {
              vertical: 'bottom',
              horizontal: 'right',
              offset: {
                x: 20,
                y: 25  // Changed from 20 to 25
              }
            }
          }
        },
        conversation_config: {
          tts: {
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.5,
              similarity: 0.75,
              style: 0.0,
              use_speaker_boost: true
            }
          }
        }
      };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);

      // Even a small change in a deeply nested property should produce a different hash
      expect(hash1).not.toBe(hash2);
      
      // Also test another deeply nested change
      const config3 = {
        name: 'agent',
        platform_settings: {
          widget: {
            color_scheme: 'light',
            position: {
              vertical: 'bottom',
              horizontal: 'right',
              offset: {
                x: 20,
                y: 20
              }
            }
          }
        },
        conversation_config: {
          tts: {
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.6,  // Changed from 0.5 to 0.6
              similarity: 0.75,
              style: 0.0,
              use_speaker_boost: true
            }
          }
        }
      };

      const hash3 = calculateConfigHash(config3);
      
      // Different nested changes should produce different hashes
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);
    });

    it('should handle null, undefined, and edge cases', () => {
      const config1 = { a: null, b: undefined, c: 0, d: '', e: false };
      const config2 = { e: false, d: '', c: 0, b: undefined, a: null };
      
      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);
      
      expect(hash1).toBe(hash2);
    });
  });
}); 