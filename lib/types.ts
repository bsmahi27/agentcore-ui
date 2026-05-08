// Shared type definitions for CLI form data

export interface CreateFormData {
  name: string;
  type: 'create' | 'import';
  framework: string;
  modelProvider: string;
  memory: string;
  build: string;
  protocol: string;
  networkMode: string;
  subnets: string;
  securityGroups: string;
  agentId: string;
  agentAliasId: string;
  region: string;
  outputDir: string;
  apiKey: string;
  idleTimeout: string;
  maxLifetime: string;
  skipGit: boolean;
  skipPythonSetup: boolean;
  skipInstall: boolean;
  noAgent: boolean;
  dryRun: boolean;
}

export interface AddAgentFormData {
  name: string;
  type: 'create' | 'byo' | 'import';
  framework: string;
  modelProvider: string;
  memory: string;
  protocol: string;
  build: string;
  language: string;
  codeLocation: string;
  entrypoint: string;
  networkMode: string;
  subnets: string;
  securityGroups: string;
  agentId: string;
  agentAliasId: string;
  region: string;
  apiKey: string;
  idleTimeout: string;
  maxLifetime: string;
}

export interface AddMemoryFormData {
  name: string;
  strategies: string[];
  expiry: string;
  deliveryType: string;
  dataStreamArn: string;
  streamContentLevel: string;
}

export interface AddGatewayFormData {
  name: string;
  description: string;
  runtimes: string;
  authorizerType: 'NONE' | 'AWS_IAM' | 'CUSTOM_JWT';
  discoveryUrl: string;
  allowedAudience: string;
  allowedClients: string;
  allowedScopes: string;
  clientId: string;
  clientSecret: string;
  idleTimeout: string;
  maxLifetime: string;
}

export interface AddCredentialFormData {
  name: string;
  type: 'api-key' | 'oauth';
  apiKey: string;
  discoveryUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
}

export interface AddEvaluatorFormData {
  name: string;
  level: 'SESSION' | 'TRACE' | 'TOOL_CALL';
  model: string;
  instructions: string;
  ratingScale: string;
}

export interface DeployFormData {
  target: string;
  autoConfirm: boolean;
  verbose: boolean;
  dryRun: boolean;
  diff: boolean;
}

export interface InvokeFormData {
  prompt: string;
  runtime: string;
  target: string;
  sessionId: string;
  userId: string;
  stream: boolean;
  bearerToken: string;
}

export interface LogsFormData {
  runtime: string;
  since: string;
  until: string;
  level: string;
  limit: string;
  query: string;
  follow: boolean;
}

export interface TracesFormData {
  runtime: string;
  limit: string;
  since: string;
  until: string;
}

export interface RemoveFormData {
  resourceType: string;
  name: string;
  autoConfirm: boolean;
  dryRun: boolean;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}
