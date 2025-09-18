import { describe, it, expect } from '@jest/globals';
import {
  updateTestInLock,
  getTestFromLock,
  LockFileData,
  LockFileAgent
} from '../utils';

describe('Test Lock File Management', () => {
  describe('updateTestInLock', () => {
    it('should update test in lock data', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: {}
      };

      updateTestInLock(lockData, 'test-name', 'test_123', 'hash123');

      expect(lockData.tests['test-name']).toEqual({
        id: 'test_123',
        hash: 'hash123'
      });
    });

    it('should initialize tests object if not present', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: undefined as any
      };

      updateTestInLock(lockData, 'test-name', 'test_123', 'hash123');

      expect(lockData.tests).toBeDefined();
      expect(lockData.tests['test-name']).toEqual({
        id: 'test_123',
        hash: 'hash123'
      });
    });

    it('should overwrite existing test data', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: {
          'test-name': {
            id: 'old_id',
            hash: 'old_hash'
          }
        }
      };

      updateTestInLock(lockData, 'test-name', 'new_id', 'new_hash');

      expect(lockData.tests['test-name']).toEqual({
        id: 'new_id',
        hash: 'new_hash'
      });
    });

    it('should handle multiple tests', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: {}
      };

      updateTestInLock(lockData, 'test1', 'id1', 'hash1');
      updateTestInLock(lockData, 'test2', 'id2', 'hash2');

      expect(lockData.tests['test1']).toEqual({
        id: 'id1',
        hash: 'hash1'
      });
      expect(lockData.tests['test2']).toEqual({
        id: 'id2',
        hash: 'hash2'
      });
    });

    it('should handle test names with special characters', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: {}
      };

      const testName = 'Test With Spaces & Special-Characters';
      updateTestInLock(lockData, testName, 'test_123', 'hash123');

      expect(lockData.tests[testName]).toEqual({
        id: 'test_123',
        hash: 'hash123'
      });
    });
  });

  describe('getTestFromLock', () => {
    it('should return test data when it exists', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: {
          'test-name': {
            id: 'test_123',
            hash: 'hash123'
          }
        }
      };

      const result = getTestFromLock(lockData, 'test-name');

      expect(result).toEqual({
        id: 'test_123',
        hash: 'hash123'
      });
    });

    it('should return undefined when test does not exist', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: {
          'other-test': {
            id: 'other_id',
            hash: 'other_hash'
          }
        }
      };

      const result = getTestFromLock(lockData, 'non-existent-test');

      expect(result).toBeUndefined();
    });

    it('should return undefined when tests object is empty', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: {}
      };

      const result = getTestFromLock(lockData, 'test-name');

      expect(result).toBeUndefined();
    });

    it('should return undefined when tests object is undefined', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: undefined as any
      };

      const result = getTestFromLock(lockData, 'test-name');

      expect(result).toBeUndefined();
    });

    it('should handle test names with special characters', () => {
      const testName = 'Test With Spaces & Special-Characters';
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: {
          [testName]: {
            id: 'test_123',
            hash: 'hash123'
          }
        }
      };

      const result = getTestFromLock(lockData, testName);

      expect(result).toEqual({
        id: 'test_123',
        hash: 'hash123'
      });
    });

    it('should distinguish between different test names', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: {
          'test1': {
            id: 'id1',
            hash: 'hash1'
          },
          'test2': {
            id: 'id2',
            hash: 'hash2'
          }
        }
      };

      expect(getTestFromLock(lockData, 'test1')).toEqual({
        id: 'id1',
        hash: 'hash1'
      });

      expect(getTestFromLock(lockData, 'test2')).toEqual({
        id: 'id2',
        hash: 'hash2'
      });
    });
  });

  describe('Integration tests', () => {
    it('should maintain data integrity across operations', () => {
      const lockData: LockFileData = {
        agents: {
          'agent1': {
            'prod': {
              id: 'agent_id',
              hash: 'agent_hash'
            }
          }
        },
        tools: {
          'tool1': {
            id: 'tool_id',
            hash: 'tool_hash'
          }
        },
        tests: {}
      };

      // Add a test
      updateTestInLock(lockData, 'test1', 'test_id1', 'test_hash1');

      // Verify agents and tools are unchanged
      expect(lockData.agents['agent1']['prod']).toEqual({
        id: 'agent_id',
        hash: 'agent_hash'
      });
      expect(lockData.tools['tool1']).toEqual({
        id: 'tool_id',
        hash: 'tool_hash'
      });

      // Verify test was added
      expect(lockData.tests['test1']).toEqual({
        id: 'test_id1',
        hash: 'test_hash1'
      });
    });

    it('should handle full CRUD operations on tests', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: {}
      };

      // Create
      updateTestInLock(lockData, 'crud-test', 'initial_id', 'initial_hash');
      expect(getTestFromLock(lockData, 'crud-test')).toBeDefined();

      // Read
      const testData = getTestFromLock(lockData, 'crud-test');
      expect(testData?.id).toBe('initial_id');
      expect(testData?.hash).toBe('initial_hash');

      // Update
      updateTestInLock(lockData, 'crud-test', 'updated_id', 'updated_hash');
      const updatedData = getTestFromLock(lockData, 'crud-test');
      expect(updatedData?.id).toBe('updated_id');
      expect(updatedData?.hash).toBe('updated_hash');

      // Delete (by setting to undefined - this would be a separate function in real implementation)
      delete lockData.tests['crud-test'];
      expect(getTestFromLock(lockData, 'crud-test')).toBeUndefined();
    });

    it('should handle concurrent test operations', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: {}
      };

      // Simulate multiple tests being added/updated concurrently
      const testOperations = [
        { name: 'test-a', id: 'id-a', hash: 'hash-a' },
        { name: 'test-b', id: 'id-b', hash: 'hash-b' },
        { name: 'test-c', id: 'id-c', hash: 'hash-c' },
        { name: 'test-a', id: 'id-a-updated', hash: 'hash-a-updated' }, // Update test-a
      ];

      testOperations.forEach(op => {
        updateTestInLock(lockData, op.name, op.id, op.hash);
      });

      // Verify final state
      expect(getTestFromLock(lockData, 'test-a')).toEqual({
        id: 'id-a-updated',
        hash: 'hash-a-updated'
      });
      expect(getTestFromLock(lockData, 'test-b')).toEqual({
        id: 'id-b',
        hash: 'hash-b'
      });
      expect(getTestFromLock(lockData, 'test-c')).toEqual({
        id: 'id-c',
        hash: 'hash-c'
      });
    });
  });
});