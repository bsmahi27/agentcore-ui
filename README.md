# AgentCore UI

A visual web interface for the [AWS AgentCore CLI](https://docs.aws.amazon.com/agentcore), built with Next.js 14, Tailwind CSS, and TypeScript.

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [AgentCore CLI](https://github.com/aws/agentcore-cli) installed and available on your PATH (`agentcore --version`)
- An initialized AgentCore project directory (`agentcore create`)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click the folder icon in the top-right header and set the path to your AgentCore project directory (the folder containing `agentcore.json`).
2. Use the sidebar to navigate between pages: Create, Deploy, Invoke, Logs, Traces, Remove, and Add Resource.
3. Fill in the form fields — the **Command Preview** updates in real time showing the exact CLI command that will be run.
4. Click the action button to execute the command and view output.

## Features

- Real-time command preview for all AgentCore CLI operations
- Dark / light theme toggle
- Streaming log and invoke output support
- Covers: `create`, `deploy`, `invoke`, `logs`, `traces`, `remove`, `add agent/memory/gateway/credential/evaluator`

## Development

```bash
npm run dev     # start development server
npm run build   # production build
npm run lint    # run ESLint
```
