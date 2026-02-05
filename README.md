# 🏢 Notion Company Analysis Workflow

A durable AI workflow that automatically researches and enriches company entries in a Notion CRM — powered by [Vercel's Workflow DevKit](https://vercel.com/docs/workflow), the [AI SDK](https://sdk.vercel.ai), and the [Notion API](https://developers.notion.com).

When a new company is added to your Notion database, this workflow analyzes it using AI, writes a structured research report directly into the Notion page, and extracts key properties (industry, region, website, revenue) to populate your CRM columns.

## What This Repo Demonstrates

- **Durable Workflows** — Using `"use workflow"` and `"use step"` directives to build fault-tolerant, resumable multi-step orchestrations
- **AI SDK with Vercel AI Gateway** — Calling `generateText` and `generateObject` through a unified gateway for LLM-powered analysis and structured data extraction
- **Notion API Integration** — Appending rich block content to pages and formatting database properties programmatically
- **Webhook-triggered Automation** — Exposing a Next.js API route that accepts Notion automation webhooks to kick off the workflow

## Tech Stack

| Technology                                                                     | Purpose                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------- |
| [Next.js 16](https://nextjs.org)                                               | App framework & API routes                        |
| [Workflow DevKit](https://vercel.com/docs/workflow) (`workflow`)               | Durable, resumable step orchestration             |
| [AI SDK v5](https://sdk.vercel.ai) (`ai`)                                      | `generateText` / `generateObject` with AI Gateway |
| [Notion SDK](https://github.com/makenotion/notion-sdk-js) (`@notionhq/client`) | Notion API client                                 |
| [Zod v4](https://zod.dev)                                                      | Schema validation for structured AI output        |
| [TypeScript](https://www.typescriptlang.org)                                   | Type safety throughout                            |
| [pnpm](https://pnpm.io)                                                        | Package manager                                   |

## Project Structure

```
├── workflows/
│   └── notion-company-analysis.ts   # Main workflow definition ("use workflow")
├── lib/
│   ├── steps/
│   │   ├── analyze-company.ts       # AI-powered company research ("use step")
│   │   ├── format-notion-properties.ts  # Markdown → Notion blocks + DB properties
│   │   ├── append-to-notion.ts      # Appends blocks to a Notion page
│   │   ├── http-request.ts          # Generic HTTP request step
│   │   └── database-query.ts        # Generic database query step
│   ├── md-to-notion.ts              # Markdown → Notion block converter
│   └── credential-helper.ts         # Environment-based credential resolution
├── app/
│   └── api/workflows/
│       └── notion-company-analysis/
│           └── route.ts             # POST endpoint that starts the workflow
├── example-body.json                # Sample Notion webhook payload
└── next.config.ts                   # Next.js config with withWorkflow plugin
```

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/installation)
- A [Notion integration](https://www.notion.so/my-integrations) with access to your target database
- An OpenAI API key (or any provider supported by Vercel AI Gateway)

### Installation

```bash
pnpm install
```

### Environment Setup

Create a `.env.local` file in the project root:

```env
NOTION_API_KEY=your_notion_integration_token
```

> The workflow uses the Vercel AI Gateway (`gateway("openai/gpt-4o-mini")`), which resolves credentials automatically in Vercel deployments. For local development, ensure your OpenAI key is available through the gateway configuration.

### Run the Development Server

```bash
pnpm dev
```

### Trigger the Workflow

Send a POST request to the workflow endpoint with a Notion webhook payload (see `example-body.json` for the expected shape):

```bash
curl -X POST http://localhost:3000/api/workflows/notion-company-analysis \
  -H "Content-Type: application/json" \
  -d @example-body.json
```

The workflow will:

1. Extract the company name from the webhook payload
2. Generate an AI-powered company analysis (vertical, online presence, traffic, revenue)
3. Convert the analysis to Notion blocks and extract structured properties
4. Append the full report to the Notion page

## Exploration Guide

### Start here: the workflow definition

Open `workflows/notion-company-analysis.ts` — this is the heart of the project. Notice the `"use workflow"` directive and how each step is a simple async function call. The Workflow DevKit makes each step independently retryable and the entire flow resumable.

### Then explore the steps

- **`lib/steps/analyze-company.ts`** — See how `generateText` from the AI SDK is used with a detailed system prompt to research a company
- **`lib/steps/format-notion-properties.ts`** — See how `generateObject` with a Zod schema extracts structured data from free-form text, and how the markdown analysis is converted to Notion blocks
- **`lib/steps/append-to-notion.ts`** — See how the Notion SDK appends block children in batches

### Experiment with

- Modify the system prompt in `analyze-company.ts` to change what the AI researches
- Add new fields to the Zod schema in `format-notion-properties.ts` to extract additional properties
- Swap the model by changing the `gateway("openai/gpt-4o-mini")` call to a different provider/model
- Explore `lib/md-to-notion.ts` to see how markdown is parsed into Notion's block format

## Useful Links

- [Workflow DevKit Documentation](https://vercel.com/docs/workflow)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Notion API Reference](https://developers.notion.com/reference)
- [Notion Automations (Webhooks)](https://www.notion.so/help/automations)
