"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const cli_1 = require("../lib/cli");
(0, node_test_1.default)('buildRegistryArgs includes registry metadata and descriptor payload', () => {
    const args = (0, cli_1.buildRegistryArgs)({
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
    strict_1.default.deepEqual(args, [
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
    strict_1.default.match((0, cli_1.argsToCommand)(args, 'aws'), /aws bedrock-agentcore-control create-registry-record/);
});
