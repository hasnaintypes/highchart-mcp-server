"use client"

import { useState } from "react"
import {
  Copy,
  Check,
  Github,
  ArrowRight,
  ExternalLink,
  Bot,
  Terminal,
  MessageSquare,
  Code2,
  BarChart3,
  Workflow,
  Printer,
  ShieldCheck,
  Shield,
  Package,
  FileCode2,
  Braces,
  Box,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ImageOff,
  BookOpen,
} from "lucide-react"

const GITHUB_URL = "https://github.com/hasnaintypes/highchart-mcp-server"
const NPM_URL = "https://www.npmjs.com/package/@highchart-mcp/server"
const INSTALL_CMD = "npm install -g @highchart-mcp/server"

const clients = [
  { name: "Claude Desktop", icon: Bot },
  { name: "Cursor", icon: Terminal },
  { name: "ChatGPT", icon: MessageSquare },
  { name: "VS Code", icon: Code2 },
  { name: "Dify", icon: Workflow },
]

const clientsDetailed = [
  { name: "claude-desktop", transport: "stdio", desc: "Local MCP config, no auth" },
  { name: "cursor", transport: "stdio", desc: "Local MCP config, no auth" },
  { name: "vscode", transport: "stdio", desc: "MCP-capable extensions" },
  { name: "dify", transport: "http", desc: "Streamable HTTP + API key" },
  { name: "claude.ai", transport: "http", desc: "Remote connector, OAuth via GitHub" },
  { name: "chatgpt", transport: "http", desc: "Remote connector, OAuth via GitHub" },
]

const features = [
  {
    icon: BarChart3,
    accent: "primary" as const,
    title: "70 Highcharts 12.x Series",
    body: "Full coverage of cartesian, financial stockChart, sankey, treemap, gantt, heatmap, and Highcharts Maps — out of the box.",
    tag: "CATALOG: ALL FAMILIES",
  },
  {
    icon: Workflow,
    accent: "secondary" as const,
    title: "Two-Tier Tools API",
    body: (
      <>
        Guided generation via <code className="text-xs font-mono font-semibold text-secondary bg-secondary-container px-1.5 py-0.5 rounded">create_chart</code>, plus raw passthrough with <code className="text-xs font-mono font-semibold text-primary bg-primary-container px-1.5 py-0.5 rounded">render_chart</code>.
      </>
    ),
    tag: "API: DUAL LEVEL",
  },
  {
    icon: Printer,
    accent: "tertiary" as const,
    title: "Headless Chromium Export",
    body: "Rendering powered by highcharts-export-server. Emits SVG, PNG, or PDF with the correct constructor selected automatically.",
    tag: "PIPELINE: SVG / PNG / PDF",
  },
  {
    icon: ShieldCheck,
    accent: "primary" as const,
    title: "Zod v4 Validation",
    body: "Catches bad axes, missing series identifiers, and malformed input before anything renders — with clear, per-type error messages.",
    tag: "SCHEMA: STRICT",
  },
  {
    icon: Shield,
    accent: "secondary" as const,
    title: "Production Hardened",
    body: "Configurable worker pool and export timeouts, request body/session limits, and token-bucket rate limiting on HTTP.",
    tag: "SECURITY: SANDBOXED",
  },
  {
    icon: Package,
    accent: "tertiary" as const,
    title: "Offline Docker Image",
    body: "The container image bakes the Highcharts script cache at build time — no CDN dependency at runtime.",
    tag: "DEPLOY: AIR-GAPPED READY",
  },
]

const tools = [
  {
    name: "list_chart_types",
    accent: "primary" as const,
    label: "TOOL-01",
    body: "Discovery catalog that returns every supported type grouped by family, with data-shape hints and examples.",
    returns: "{ families: [...] }",
  },
  {
    name: "create_chart",
    accent: "secondary" as const,
    label: "TOOL-02",
    body: "Accepts structured input (series, axes, type) for any supported chart and composes a validated Highcharts config.",
    returns: "{ constr, options }",
  },
  {
    name: "render_chart",
    accent: "tertiary" as const,
    label: "TOOL-03",
    body: "Raw passthrough for advanced use: takes a full Highcharts options object and renders it directly, for any type.",
    returns: "{ constr, options }",
  },
  {
    name: "export_chart",
    accent: "primary" as const,
    label: "TOOL-04",
    body: "Like render_chart, plus format (svg/png/pdf), width/height/scale, and constr overrides for publishing.",
    returns: "{ data, format }",
  },
]

const packages = [
  {
    icon: Terminal,
    accent: "primary" as const,
    name: "@highchart-mcp/server",
    badge: "NPM",
    body: "The MCP server and CLI binary. STDIO and Streamable HTTP transports, with auth and rate limiting.",
    cmd: "npm install -g @highchart-mcp/server",
  },
  {
    icon: FileCode2,
    accent: "secondary" as const,
    name: "@highchart-mcp/sdk",
    badge: "TypeScript",
    body: "Typed JS/TS client with request factories for create_chart, render_chart, export_chart, and list_chart_types.",
    cmd: "npm install @highchart-mcp/sdk",
  },
  {
    icon: Braces,
    accent: "tertiary" as const,
    name: "highchart-mcp-sdk",
    badge: "PyPI",
    body: "Async Python client with stdio subprocess and HTTP connectors, for any Python-based agent framework.",
    cmd: "pip install highchart-mcp-sdk",
  },
  {
    icon: Box,
    accent: "primary" as const,
    name: "Dockerfile",
    badge: "Container",
    body: "Bundled in the repo — builds an image with the Highcharts script cache baked in for air-gapped deployments.",
    cmd: "docker build -t highchart-mcp-server .",
  },
]

const codeTabs = [
  {
    id: "claude",
    label: "Claude Desktop",
    filename: "claude_desktop_config.json",
    status: "STDIO",
    code: `{
  "mcpServers": {
    "highchart-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/highchart-mcp-server/dist/index.js"],
      "env": { "TRANSPORT": "stdio" }
    }
  }
}`,
  },
  {
    id: "payload",
    label: "create_chart payload",
    filename: "MCP tool invocation: create_chart",
    status: "ZOD VALIDATED",
    code: `{
  "type": "line",
  "title": "Monthly Sales",
  "xAxisCategories": ["Jan", "Feb", "Mar"],
  "series": [
    { "name": "Revenue", "data": [10, 20, 15] }
  ]
}`,
  },
  {
    id: "http",
    label: "Streamable HTTP",
    filename: "Daemon command: highchart-mcp serve",
    status: "HTTP",
    code: `$ TRANSPORT=http PORT=3000 node dist/index.js

POST /mcp     — MCP endpoint
GET  /health  — health check
GET  /metrics — Prometheus metrics`,
  },
  {
    id: "sdk",
    label: "TypeScript SDK",
    filename: "index.ts — SDK integration",
    status: "NODE 20+",
    code: `import { HighchartClient } from '@highchart-mcp/sdk';

const client = await HighchartClient.connectHttp(
  'http://localhost:3000/mcp',
  { apiKey }
);

const { options } = await client.createChart({
  type: 'line',
  series: [{ data: [1, 2, 3] }],
});`,
  },
]

const comparisons = [
  {
    title: "highchart-mcp",
    icon: Terminal,
    tone: "winner" as const,
    items: [
      "All 70 Highcharts 12.x series types — cartesian to maps to gantt",
      "Real headless Chromium export — vector SVG, PNG, PDF",
      "Zod v4 validation catches bad input before it ever renders",
      "STDIO or Streamable HTTP, with auth and rate limiting",
      "Offline render cache — no CDN dependency at runtime",
    ],
  },
  {
    title: "Asking an LLM to draw it",
    icon: HelpCircle,
    tone: "muted" as const,
    items: [
      "No real Highcharts engine — output is a guess, not a validated config",
      "No export pipeline — nothing to drop into a report or a page",
      "No schema, so malformed axes or series fail silently",
      "Every call re-explains chart structure from scratch",
    ],
  },
  {
    title: "Rolling your own wrapper",
    icon: ImageOff,
    tone: "muted" as const,
    items: [
      "You write the validation layer",
      "You write the export server integration",
      "You write the MCP tool contracts and auth yourself",
      "No offline cache or tested chart-type coverage out of the box",
    ],
  },
]

const accentClasses = {
  primary: { bg: "bg-primary-container", text: "text-primary" },
  secondary: { bg: "bg-secondary-container", text: "text-secondary" },
  tertiary: { bg: "bg-tertiary-container", text: "text-tertiary" },
}

export default function HighchartMcpLanding() {
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({})
  const [activeTab, setActiveTab] = useState(codeTabs[0].id)

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates((prev) => ({ ...prev, [key]: true }))
      setTimeout(() => setCopiedStates((prev) => ({ ...prev, [key]: false })), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const activePane = codeTabs.find((t) => t.id === activeTab) ?? codeTabs[0]

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased flex flex-col">
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm border-b border-outline-variant">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-black">
              <span className="font-mono text-sm font-bold">&gt;_</span>
            </div>
            <span className="font-bold text-lg tracking-tight group-hover:text-secondary transition-colors">
              highchart-mcp
            </span>
          </a>

          <nav className="flex items-center gap-6">
            <a href="/docs" className="text-sm font-semibold text-on-surface-variant hover:text-secondary transition-colors">
              Docs
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-secondary transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* ==================== HERO ==================== */}
        <section className="relative w-full pt-16 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-96 bg-gradient-to-b from-primary-container/60 via-secondary-container/40 to-transparent blur-3xl -z-10 pointer-events-none rounded-full" />

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container border border-outline-variant text-xs font-medium text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold text-primary uppercase tracking-wider text-[11px]">New</span>
            <span className="text-outline">|</span>
            <span>OAuth for Claude.ai &amp; ChatGPT remote connectors</span>
          </div>

          <h1 className="mt-8 font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight max-w-4xl">
            AI prompts transformed into{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-tertiary">
              crisp Highcharts
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base sm:text-lg text-on-surface-variant leading-relaxed">
            An open-source Model Context Protocol server that turns structured input or raw Highcharts
            options into validated chart configs and rendered SVG, PNG, or PDF — built for Claude Desktop,
            Cursor, and any MCP-capable client.
          </p>

          <div className="mt-8 w-full max-w-lg">
            <div className="flex items-center justify-between p-1.5 pl-5 bg-surface-container border border-outline rounded-full">
              <div className="flex items-center gap-2 font-mono text-sm overflow-x-auto py-1">
                <span className="text-primary font-bold select-none">&gt;_</span>
                <span className="font-medium">{INSTALL_CMD}</span>
              </div>
              <button
                onClick={() => copyToClipboard(INSTALL_CMD, "hero-install")}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container-high hover:bg-primary-container text-primary rounded-full text-xs font-bold transition-all"
              >
                {copiedStates["hero-install"] ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/docs"
              className="px-7 py-3 bg-primary hover:bg-primary-hover text-black text-sm font-bold rounded-full transition-all flex items-center gap-2"
            >
              <span>Quick Start Guide</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/docs"
              className="px-7 py-3 bg-surface-container hover:bg-surface-container-high border border-outline text-sm font-semibold rounded-full transition-all flex items-center gap-2"
            >
              <span>Documentation</span>
              <ExternalLink className="w-4 h-4 text-on-surface-variant" />
            </a>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-medium text-on-surface-variant">
            <span className="text-outline uppercase tracking-wider text-[11px] mr-1">Supported Clients</span>
            {clients.map((client) => (
              <span
                key={client.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full border border-outline-variant"
              >
                <client.icon className="w-4 h-4 text-primary" />
                {client.name}
              </span>
            ))}
          </div>
        </section>

        {/* ==================== WORKS WITH ANY MCP CLIENT ==================== */}
        <section className="w-full py-20 px-6 max-w-7xl mx-auto border-t border-outline-variant" id="clients">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Works with any MCP client</h2>
            <p className="mt-3 text-base text-on-surface-variant">
              STDIO for local desktop clients, Streamable HTTP with API-key/JWT or OAuth for remote
              connectors.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-surface-container rounded-2xl border border-outline overflow-hidden">
            <div className="px-5 py-3.5 bg-surface-container-high flex items-center justify-between border-b border-outline">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 font-mono text-xs text-on-surface-variant font-medium">mcp.json</span>
              </div>
              <span className="text-primary font-mono text-xs font-semibold">STDIO</span>
            </div>

            <div className="p-6 bg-background font-mono text-xs">
              <pre className="leading-relaxed">{`{
  "mcpServers": {
    "highchart-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/highchart-mcp-server/dist/index.js"],
      "env": { "TRANSPORT": "stdio" }
    }
  }
}`}</pre>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-6 pt-0">
              {clientsDetailed.map((client) => (
                <div
                  key={client.name}
                  className="flex items-center justify-between py-2 px-3 rounded-xl border border-outline-variant hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    <span className="font-mono text-xs">{client.name}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-on-surface-variant">{client.transport}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== ARCHITECTURE: 6-CARD MATRIX ==================== */}
        <section className="w-full py-20 px-6 max-w-7xl mx-auto border-t border-outline-variant">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-secondary-container text-secondary text-xs font-bold uppercase tracking-wider mb-3">
              Architecture Overview
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Visual intelligence for LLM context windows
            </h2>
            <p className="mt-3 text-base text-on-surface-variant">
              Structured intent in, a validated Highcharts specification out — with deterministic schema
              checks and headless Chromium rendering.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-7 bg-surface-container rounded-2xl border border-outline hover:border-primary/50 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className={`w-12 h-12 rounded-full ${accentClasses[feature.accent].bg} ${accentClasses[feature.accent].text} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{feature.body}</p>
                </div>
                <div className={`mt-6 pt-4 border-t border-outline-variant flex items-center justify-between text-xs font-bold ${accentClasses[feature.accent].text}`}>
                  <span className="tracking-wide">{feature.tag}</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==================== CORE PROTOCOL TOOLS ==================== */}
        <section className="w-full py-20 px-6 bg-surface-container border-y border-outline-variant" id="tools">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-primary-container text-primary text-xs font-bold uppercase tracking-wider mb-3">
              Core Protocol Tools
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-center tracking-tight">
              Four MCP tools at your agent&apos;s fingertips
            </h2>
            <p className="mt-3 text-center max-w-2xl text-base text-on-surface-variant">
              Discover, synthesize, and export Highcharts configurations inside any Model Context
              Protocol loop.
            </p>

            <div className="mt-12 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className="p-6 bg-background rounded-2xl border border-outline hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`font-mono text-xs font-bold ${accentClasses[tool.accent].text} ${accentClasses[tool.accent].bg} px-2.5 py-1 rounded-full`}>
                        {tool.name}
                      </span>
                      <span className="text-[11px] font-semibold text-on-surface-variant tracking-wider">{tool.label}</span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed mt-2">{tool.body}</p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-outline-variant font-mono text-xs flex items-center justify-between">
                    <span className="text-on-surface-variant">RETURNS:</span>
                    <span className="font-medium">{tool.returns}</span>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="/docs"
              className="mt-10 px-6 py-2.5 bg-background hover:bg-surface-container-high border border-outline rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <span>Explore the full CLI reference</span>
              <ArrowRight className="w-4 h-4 text-primary" />
            </a>
          </div>
        </section>

        {/* ==================== CONTEXT BUILDING IN ACTION ==================== */}
        <section className="w-full py-20 px-6 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-secondary-container text-secondary text-xs font-bold uppercase tracking-wider mb-2">
              Real Output
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Context building in action</h2>
            <p className="mt-2 text-base text-on-surface-variant">
              How the same server looks from a config file, a tool call, the HTTP transport, and the SDK.
            </p>
          </div>

          <div className="w-full bg-surface-container rounded-2xl border border-outline overflow-hidden">
            <div className="px-5 py-3.5 bg-surface-container-high flex flex-wrap items-center justify-between gap-4 border-b border-outline">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 font-mono text-xs text-on-surface-variant font-medium">highchart-mcp</span>
              </div>
              <div className="flex items-center gap-1 bg-background/60 rounded-full p-1">
                {codeTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeTab === tab.id ? "bg-primary text-black font-bold" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[400px]">
              <div className="lg:col-span-7 p-6 bg-background flex flex-col font-mono text-xs">
                <div className="flex items-center justify-between text-on-surface-variant pb-3 mb-3 border-b border-outline-variant">
                  <span>{activePane.filename}</span>
                  <span className="text-primary font-semibold">{activePane.status}</span>
                </div>
                <pre className="leading-relaxed whitespace-pre-wrap">{activePane.code}</pre>
              </div>

              <div className="lg:col-span-5 p-6 bg-surface-container-high flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-outline">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Export Output</span>
                    <span className="px-2.5 py-0.5 bg-primary-container text-primary font-bold rounded-full text-[11px]">SVG</span>
                  </div>
                  <div className="w-full bg-background rounded-xl p-3 border border-outline">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/charts/line.svg" alt="Monthly Revenue chart rendered by highchart-mcp" className="w-full h-auto" />
                  </div>
                </div>
                <div className="mt-6 pt-4 flex items-center justify-between text-xs text-on-surface-variant">
                  <div className="flex items-center gap-2 text-tertiary font-medium">
                    <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                    <span>RENDERED VIA HEADLESS CHROMIUM</span>
                  </div>
                  <span>FORMAT: SVG</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== ECOSYSTEM / PACKAGES ==================== */}
        <section className="w-full py-20 px-6 bg-surface-container border-y border-outline-variant" id="packages">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-primary-container text-primary text-xs font-bold uppercase tracking-wider mb-3">
                Developer Ecosystem
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Published packages across JavaScript &amp; Python
              </h2>
              <p className="mt-2 text-base text-on-surface-variant">
                Independently versioned, each in its own package.json / pyproject.toml.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {packages.map((pkg) => (
                <div
                  key={pkg.name}
                  className="p-6 bg-background rounded-2xl border border-outline hover:border-primary/40 transition-all duration-200 flex items-start gap-4"
                >
                  <div className={`w-12 h-12 rounded-full ${accentClasses[pkg.accent].bg} ${accentClasses[pkg.accent].text} flex items-center justify-center shrink-0`}>
                    <pkg.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-bold truncate">{pkg.name}</span>
                      <span className={`px-2.5 py-0.5 rounded-full ${accentClasses[pkg.accent].bg} ${accentClasses[pkg.accent].text} text-[11px] font-bold`}>
                        {pkg.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">{pkg.body}</p>
                    <div className="mt-4 flex items-center justify-between font-mono text-xs bg-surface-container border border-outline-variant px-3.5 py-2 rounded-full">
                      <span className="truncate">{pkg.cmd}</span>
                      <button
                        onClick={() => copyToClipboard(pkg.cmd, pkg.name)}
                        className="ml-2 text-on-surface-variant hover:text-primary transition-colors shrink-0"
                      >
                        {copiedStates[pkg.name] ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-background rounded-2xl border border-outline">
              <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">Common CLI commands</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-3.5 bg-surface-container rounded-xl border border-outline-variant flex flex-col gap-1">
                  <span className="text-on-surface-variant font-sans text-xs">Discover types:</span>
                  <code className="text-primary font-bold">highchart-mcp list-types</code>
                </div>
                <div className="p-3.5 bg-surface-container rounded-xl border border-outline-variant flex flex-col gap-1">
                  <span className="text-on-surface-variant font-sans text-xs">Create a chart:</span>
                  <code className="text-secondary font-bold">highchart-mcp create --type line</code>
                </div>
                <div className="p-3.5 bg-surface-container rounded-xl border border-outline-variant flex flex-col gap-1">
                  <span className="text-on-surface-variant font-sans text-xs">Start the HTTP server:</span>
                  <code className="text-tertiary font-bold">highchart-mcp serve --port 3000</code>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== WHY USE HIGHCHART-MCP ==================== */}
        <section className="w-full py-20 px-6 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Why use highchart-mcp</h2>
            <p className="mt-2 text-base text-on-surface-variant">
              Free, open source, and built so an agent never has to guess at a chart's structure.
            </p>
          </div>

          <div className="w-full bg-surface-container rounded-3xl p-6 sm:p-10 border border-outline">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {comparisons.map((col) => (
                <div
                  key={col.title}
                  className={`flex flex-col gap-4 p-5 rounded-2xl border ${
                    col.tone === "winner" ? "bg-primary-container/40 border-primary/30" : "bg-background border-outline-variant"
                  }`}
                >
                  <div className={`flex items-center gap-2 pb-2 border-b ${col.tone === "winner" ? "border-primary/30" : "border-outline-variant"}`}>
                    <col.icon className={`w-5 h-5 ${col.tone === "winner" ? "text-primary" : "text-on-surface-variant"}`} />
                    <span className={`font-bold text-lg ${col.tone === "winner" ? "text-primary" : "text-on-surface-variant"}`}>
                      {col.title}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-3 text-sm">
                    {col.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        {col.tone === "winner" ? (
                          <CheckCircle2 className="w-[18px] h-[18px] text-primary shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-[18px] h-[18px] text-on-surface-variant shrink-0 mt-0.5" />
                        )}
                        <span className={col.tone === "winner" ? "" : "text-on-surface-variant"}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== CALL TO ACTION BANNER ==================== */}
        <section className="w-full px-6 pb-20 max-w-6xl mx-auto" id="get-started">
          <div className="w-full relative overflow-hidden rounded-3xl bg-gradient-to-tr from-primary via-secondary to-tertiary p-8 sm:p-14 text-center text-black">
            <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Chart anything, from any MCP client</h2>
              <p className="mt-4 text-base sm:text-lg text-black/80">
                Free and open source. The only cost is tokens.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-8 py-3.5 bg-black text-white text-sm font-bold rounded-full transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <span>Get Started Now</span>
                  <Terminal className="w-[18px] h-[18px]" />
                </a>
                <a
                  href="/docs"
                  className="px-8 py-3.5 bg-black/15 hover:bg-black/25 text-black border border-black/30 text-sm font-semibold rounded-full transition-all flex items-center gap-2"
                >
                  <span>Read Documentation</span>
                  <BookOpen className="w-[18px] h-[18px]" />
                </a>
              </div>
              <div className="mt-8 text-xs font-mono text-black/70">
                ISC LICENSE · HIGHCHARTS® REQUIRES ITS OWN LICENSE FOR COMMERCIAL USE
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ==================== FOOTER ==================== */}
      <footer className="w-full bg-surface-container border-t border-outline-variant pt-14 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-outline-variant">
            <div className="md:col-span-2 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-black text-xs font-mono font-bold">
                  &gt;_
                </div>
                <span className="font-bold text-lg tracking-tight">highchart-mcp</span>
              </div>
              <p className="text-sm text-on-surface-variant max-w-sm leading-relaxed">
                The open-source Model Context Protocol server for validated, Chromium-rendered Highcharts —
                built for engineers and AI agents alike.
              </p>
              <div className="mt-2 text-on-surface-variant text-xs">
                <span>Built by <strong className="text-on-surface">Hasnain</strong></span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider">Product</h4>
              <a href="#tools" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Core Tools</a>
              <a href="#packages" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Packages</a>
              <a href="/docs" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Documentation</a>
              <a href="#get-started" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Quickstart</a>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider">Resources</h4>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="text-sm text-on-surface-variant hover:text-primary transition-colors">GitHub Repository</a>
              <a href={NPM_URL} target="_blank" rel="noreferrer" className="text-sm text-on-surface-variant hover:text-primary transition-colors">npm Package</a>
              <a href="https://pypi.org/project/highchart-mcp-sdk/" target="_blank" rel="noreferrer" className="text-sm text-on-surface-variant hover:text-primary transition-colors">PyPI SDK</a>
              <a href="https://www.highcharts.com/" target="_blank" rel="noreferrer" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Highcharts Docs</a>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider">Legal</h4>
              <span className="text-sm text-on-surface-variant">ISC License</span>
              <a href={`${GITHUB_URL}/blob/master/LICENSING.md`} target="_blank" rel="noreferrer" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Highcharts Licensing</a>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Source Code</a>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-on-surface-variant">
            <p>© 2026 highchart-mcp. Released under the ISC License.</p>
            <p className="max-w-xl text-left md:text-right">
              Highcharts® is a registered trademark of Highsoft AS. Highcharts itself requires a separate
              license for commercial use.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
