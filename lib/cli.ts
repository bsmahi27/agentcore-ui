// CLI argument builders – each function returns string[] suitable for
// spawn('agentcore', args).  Never concatenate into a shell string.

export type Args = string[];

/** Push --flag value only when value is a non-empty string */
function kv(args: Args, flag: string, value: string | undefined) {
  if (value && value.trim()) args.push(flag, value.trim());
}

/** Push bare flag only when condition is truthy */
function flag(args: Args, f: string, condition: boolean | undefined) {
  if (condition) args.push(f);
}

// ---------------------------------------------------------------------------
// agentcore create
// ---------------------------------------------------------------------------
export function buildCreateArgs(d: Record<string, any>): Args {
  const args: Args = ['create'];
  kv(args, '--name', d.name);
  if (d.type === 'import') {
    args.push('--type', 'import');
    kv(args, '--agent-id', d.agentId);
    kv(args, '--agent-alias-id', d.agentAliasId);
    kv(args, '--region', d.region);
  }
  kv(args, '--framework', d.framework);
  kv(args, '--model-provider', d.modelProvider);
  kv(args, '--memory', d.memory);
  kv(args, '--build', d.build);
  kv(args, '--protocol', d.protocol);
  kv(args, '--network-mode', d.networkMode);
  if (d.networkMode === 'VPC') {
    kv(args, '--subnets', d.subnets);
    kv(args, '--security-groups', d.securityGroups);
  }
  kv(args, '--output-dir', d.outputDir);
  kv(args, '--api-key', d.apiKey);
  kv(args, '--idle-timeout', d.idleTimeout);
  kv(args, '--max-lifetime', d.maxLifetime);
  flag(args, '--skip-git', d.skipGit);
  flag(args, '--skip-python-setup', d.skipPythonSetup);
  flag(args, '--skip-install', d.skipInstall);
  flag(args, '--no-agent', d.noAgent);
  flag(args, '--dry-run', d.dryRun);
  args.push('--json');
  return args;
}

// ---------------------------------------------------------------------------
// agentcore add agent
// ---------------------------------------------------------------------------
export function buildAddAgentArgs(d: Record<string, any>): Args {
  const args: Args = ['add', 'agent'];
  kv(args, '--name', d.name);
  kv(args, '--type', d.type);
  if (d.type === 'byo') {
    kv(args, '--code-location', d.codeLocation);
    kv(args, '--entrypoint', d.entrypoint);
    kv(args, '--language', d.language);
  } else if (d.type === 'import') {
    kv(args, '--agent-id', d.agentId);
    kv(args, '--agent-alias-id', d.agentAliasId);
    kv(args, '--region', d.region);
  } else {
    kv(args, '--framework', d.framework);
    kv(args, '--model-provider', d.modelProvider);
  }
  kv(args, '--memory', d.memory);
  kv(args, '--protocol', d.protocol);
  kv(args, '--build', d.build);
  kv(args, '--network-mode', d.networkMode);
  if (d.networkMode === 'VPC') {
    kv(args, '--subnets', d.subnets);
    kv(args, '--security-groups', d.securityGroups);
  }
  kv(args, '--api-key', d.apiKey);
  kv(args, '--idle-timeout', d.idleTimeout);
  kv(args, '--max-lifetime', d.maxLifetime);
  args.push('--json');
  return args;
}

// ---------------------------------------------------------------------------
// agentcore add memory
// ---------------------------------------------------------------------------
export function buildAddMemoryArgs(d: Record<string, any>): Args {
  const args: Args = ['add', 'memory'];
  kv(args, '--name', d.name);
  if (Array.isArray(d.strategies) && d.strategies.length)
    args.push('--strategies', d.strategies.join(','));
  kv(args, '--expiry', d.expiry);
  kv(args, '--delivery-type', d.deliveryType);
  kv(args, '--data-stream-arn', d.dataStreamArn);
  kv(args, '--stream-content-level', d.streamContentLevel);
  args.push('--json');
  return args;
}

// ---------------------------------------------------------------------------
// agentcore add gateway
// ---------------------------------------------------------------------------
export function buildAddGatewayArgs(d: Record<string, any>): Args {
  const args: Args = ['add', 'gateway'];
  kv(args, '--name', d.name);
  kv(args, '--description', d.description);
  kv(args, '--runtimes', d.runtimes);
  kv(args, '--authorizer-type', d.authorizerType);
  if (d.authorizerType === 'CUSTOM_JWT') {
    kv(args, '--discovery-url', d.discoveryUrl);
    kv(args, '--allowed-audience', d.allowedAudience);
    kv(args, '--allowed-clients', d.allowedClients);
    kv(args, '--allowed-scopes', d.allowedScopes);
    kv(args, '--client-id', d.clientId);
    kv(args, '--client-secret', d.clientSecret);
  }
  kv(args, '--idle-timeout', d.idleTimeout);
  kv(args, '--max-lifetime', d.maxLifetime);
  args.push('--json');
  return args;
}

// ---------------------------------------------------------------------------
// agentcore add credential
// ---------------------------------------------------------------------------
export function buildAddCredentialArgs(d: Record<string, any>): Args {
  const args: Args = ['add', 'credential'];
  kv(args, '--name', d.name);
  if (d.type === 'oauth') {
    args.push('--type', 'oauth');
    kv(args, '--discovery-url', d.discoveryUrl);
    kv(args, '--client-id', d.clientId);
    kv(args, '--client-secret', d.clientSecret);
    kv(args, '--scopes', d.scopes);
  } else {
    kv(args, '--api-key', d.apiKey);
  }
  args.push('--json');
  return args;
}

// ---------------------------------------------------------------------------
// agentcore add evaluator
// ---------------------------------------------------------------------------
export function buildAddEvaluatorArgs(d: Record<string, any>): Args {
  const args: Args = ['add', 'evaluator'];
  kv(args, '--name', d.name);
  kv(args, '--level', d.level);
  kv(args, '--model', d.model);
  kv(args, '--instructions', d.instructions);
  kv(args, '--rating-scale', d.ratingScale);
  args.push('--json');
  return args;
}

// ---------------------------------------------------------------------------
// agentcore deploy
// ---------------------------------------------------------------------------
export function buildDeployArgs(d: Record<string, any>): Args {
  const args: Args = ['deploy'];
  kv(args, '--target', d.target);
  flag(args, '-y', d.autoConfirm);
  flag(args, '-v', d.verbose);
  flag(args, '--dry-run', d.dryRun);
  flag(args, '--diff', d.diff);
  args.push('--json');
  return args;
}

// ---------------------------------------------------------------------------
// agentcore invoke
// ---------------------------------------------------------------------------
export function buildInvokeArgs(d: Record<string, any>): Args {
  const args: Args = ['invoke'];
  kv(args, '--prompt', d.prompt);
  kv(args, '--runtime', d.runtime);
  kv(args, '--target', d.target);
  kv(args, '--session-id', d.sessionId);
  kv(args, '--user-id', d.userId);
  flag(args, '--stream', d.stream);
  kv(args, '--bearer-token', d.bearerToken);
  if (!d.stream) args.push('--json');
  return args;
}

// ---------------------------------------------------------------------------
// agentcore logs
// ---------------------------------------------------------------------------
export function buildLogsArgs(d: Record<string, any>): Args {
  const args: Args = ['logs'];
  kv(args, '--runtime', d.runtime);
  kv(args, '--since', d.since);
  kv(args, '--until', d.until);
  kv(args, '--level', d.level);
  kv(args, '--limit', d.limit);
  kv(args, '--query', d.query);
  if (!d.follow) args.push('--json');
  return args;
}

// ---------------------------------------------------------------------------
// agentcore status
// ---------------------------------------------------------------------------
export function buildStatusArgs(d?: Record<string, any>): Args {
  const args: Args = ['status'];
  if (d?.runtime) kv(args, '--runtime', d.runtime);
  if (d?.type) kv(args, '--type', d.type);
  if (d?.state) kv(args, '--state', d.state);
  args.push('--json');
  return args;
}

// ---------------------------------------------------------------------------
// agentcore traces list
// ---------------------------------------------------------------------------
export function buildTracesListArgs(d: Record<string, any>): Args {
  const args: Args = ['traces', 'list'];
  kv(args, '--runtime', d.runtime);
  kv(args, '--limit', d.limit);
  kv(args, '--since', d.since);
  kv(args, '--until', d.until);
  return args;
}

// ---------------------------------------------------------------------------
// agentcore remove
// ---------------------------------------------------------------------------
export function buildRemoveArgs(d: Record<string, any>): Args {
  const args: Args = ['remove', d.resourceType];
  if (d.resourceType !== 'all') kv(args, '--name', d.name);
  flag(args, '-y', d.autoConfirm);
  flag(args, '--dry-run', d.dryRun);
  args.push('--json');
  return args;
}

// ---------------------------------------------------------------------------
// Utility: render args as a human-readable command string for preview
// ---------------------------------------------------------------------------
export function argsToCommand(args: Args): string {
  const parts = args.map((a) => (a.includes(' ') ? `"${a}"` : a));
  return `agentcore ${parts.join(' ')}`;
}
