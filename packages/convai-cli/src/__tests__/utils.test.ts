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

    it('should detect prompt value changes in agent configs', () => {
      const config1 = {
        name: 'Test Agent',
        conversation_config: {
          agent: {
            prompt: {
              prompt: 'You are a helpful assistant.',
              temperature: 0.5
            }
          }
        }
      };

      const config2 = {
        name: 'Test Agent',
        conversation_config: {
          agent: {
            prompt: {
              prompt: 'You are a different assistant.',
              temperature: 0.5
            }
          }
        }
      };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate same hash for identical nested configs with different key orders', () => {
      const config1 = {
        name: 'Test Agent',
        conversation_config: {
          agent: {
            prompt: {
              prompt: 'You are a helpful assistant.',
              temperature: 0.5,
              max_tokens: 1000
            },
            language: 'en'
          },
          tts: {
            voice_id: 'abc123',
            model_id: 'turbo'
          }
        }
      };

      const config2 = {
        conversation_config: {
          tts: {
            model_id: 'turbo',
            voice_id: 'abc123'
          },
          agent: {
            language: 'en',
            prompt: {
              max_tokens: 1000,
              temperature: 0.5,
              prompt: 'You are a helpful assistant.'
            }
          }
        },
        name: 'Test Agent'
      };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);
      
      expect(hash1).toBe(hash2);
    });

    it('should detect subtle changes in nested values', () => {
      const config1 = {
        conversation_config: {
          agent: {
            prompt: {
              prompt: 'Hello',
              temperature: 0.5
            }
          }
        }
      };

      const config2 = {
        conversation_config: {
          agent: {
            prompt: {
              prompt: 'Hello ',  // Extra space
              temperature: 0.5
            }
          }
        }
      };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle deep nesting with mixed data types', () => {
      const config1 = {
        platform_settings: {
          widget: {
            styles: {
              base: null,
              accent: '#ff0000'
            },
            text_contents: {
              labels: ['start', 'stop'],
              enabled: true
            }
          }
        }
      };

      const config2 = {
        platform_settings: {
          widget: {
            text_contents: {
              enabled: true,
              labels: ['start', 'stop']
            },
            styles: {
              accent: '#ff0000',
              base: null
            }
          }
        }
      };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);
      
      expect(hash1).toBe(hash2);
    });
  });
}); 