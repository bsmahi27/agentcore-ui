import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRegistryArgs, argsToCommand } from '../lib/cli';

test('buildRegistryArgs includes registry metadata and descriptor payload', () => {
  const args = buildRegistryArgs({
    registryId: 'reg-123',
    name: 'MyAgent',
    description: 'Sample agent registration',
    recordVersion: '1.0.0',
    descriptorType: 'Agent',
    sourceType: 'manual',
    descriptors: '{"name":"my-agent"}',
    region: 'us-east-1',
    createAsDraft: true,
  });

  assert.deepEqual(args, [
    'bedrock-agentcore-control',
    'create-registry-record',
    '--registry-id',
    'reg-123',
    '--name',
    'MyAgent',
    '--descriptor-type',
    'Agent',
    '--record-version',
    '1.0.0',
    '--description',
    'Sample agent registration',
    '--source-type',
    'manual',
    '--descriptors',
    '{"name":"my-agent"}',
    '--region',
    'us-east-1',
  ]);

  assert.match(argsToCommand(args, 'aws'), /aws bedrock-agentcore-control create-registry-record/);
});
