import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface AgentMetadata {
  name: string;
  description?: string;
  version?: string;
  owner?: string;
  status?: string;
  capabilities?: string[];
}

interface AgentInfo {
  name: string;
  path: string;
  metadata?: AgentMetadata;
  registrationStatus?: string;
}

async function getAgentMetadata(agentPath: string): Promise<AgentMetadata | undefined> {
  try {
    const definitionPath = path.join(agentPath, 'agent-definition.json');
    const data = await fs.readFile(definitionPath, 'utf-8');
    const metadata = JSON.parse(data);
    return {
      name: metadata.name,
      description: metadata.description,
      version: metadata.version,
      owner: metadata.owner,
      status: metadata.status,
      capabilities: metadata.capabilities,
    };
  } catch {
    return undefined;
  }
}

async function getRegistrationStatus(agentPath: string): Promise<string> {
  try {
    const resultPath = path.join(agentPath, 'agentcore', '.cli', 'registration-result.json');
    const data = await fs.readFile(resultPath, 'utf-8');
    const result = JSON.parse(data);
    return result.success ? 'registered' : 'failed';
  } catch {
    return 'not-registered';
  }
}

export async function GET() {
  const workspaceRoot = process.cwd();
  const generatedAgentsDir = path.join(workspaceRoot, 'generated_agents');

  try {
    const entries = await fs.readdir(generatedAgentsDir, { withFileTypes: true });
    
    const agentPromises = entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const agentPath = path.join(generatedAgentsDir, entry.name);
        const metadata = await getAgentMetadata(agentPath);
        const registrationStatus = await getRegistrationStatus(agentPath);
        
        return {
          name: entry.name,
          path: agentPath,
          metadata,
          registrationStatus,
        } as AgentInfo;
      });

    const agents = await Promise.all(agentPromises);
    agents.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ agents });
  } catch {
    return NextResponse.json({ agents: [] });
  }
}
