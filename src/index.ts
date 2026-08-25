#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Configuration
const BASE_URL = "https://aget.cc";
const API_TOKEN = process.env.AGET_API_TOKEN || "";

if (!API_TOKEN) {
  console.error("Warning: AGET_API_TOKEN is not set. Tools requiring auth will fail with 401.");
}

// Fetch helper with timeout and retry
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  timeoutMs = 15000
): Promise<Response> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError || new Error(`Request to ${url} failed after ${maxRetries} attempts`);
}

// JSON request helper, throws with server error message on non-2xx
async function apiRequest(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<any> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (auth) headers["Authorization"] = `Bearer ${API_TOKEN}`;

  const res = await fetchWithRetry(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`API 错误 (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

function jsonResult(data: any) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

// Initialize MCP Server
const server = new Server(
  {
    name: "aget-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool Definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "aget_get_profile",
        description:
          "获取当前用户的 aget.cc 个人信息（UID、邮箱、角色、注册时间、发布数量），需要配置 AGET_API_TOKEN",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "aget_create_post",
        description:
          "在 aget.cc 发布一条优惠信息（优惠券、折扣码、羊毛链接等）。标题最长 80 字，正文最长 1000 字，每分钟最多 10 条、每天最多 100 条。可用 aget_list_tags 查询可选标签 ID",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "标题（必填，≤80 字，例如「VPS 五折优惠码」）",
            },
            content: {
              type: "string",
              description: "正文内容（必填，≤1000 字，可包含优惠码、链接等）",
            },
            expiresAt: {
              type: "string",
              description: "可选的过期时间，ISO 8601 格式（例如 2026-12-31T23:59:59+08:00）",
            },
            tagIds: {
              type: "array",
              items: { type: "number" },
              description: "可选的标签 ID 数组（最多 5 个，通过 aget_list_tags 获取）",
            },
          },
          required: ["title", "content"],
        },
      },
      {
        name: "aget_list_deals",
        description:
          "查询 aget.cc 公开的优惠信息列表，支持按时间范围筛选：today=今日、yesterday=昨日、week=本周（近7天）、all=全部；支持关键词搜索和标签筛选",
        inputSchema: {
          type: "object",
          properties: {
            tab: {
              type: "string",
              enum: ["today", "yesterday", "week", "all"],
              description: "时间范围：today=今日，yesterday=昨日，week=本周近7天，all=全部（默认 today）",
            },
            q: {
              type: "string",
              description: "可选的关键词搜索（匹配标题和正文，≤100 字）",
            },
            tag: {
              type: "string",
              description: "可选的标签短语筛选（例如 coupon、deal、code 等英文短语）",
            },
            page: {
              type: "number",
              description: "页码（默认 1，每页 20 条）",
            },
          },
        },
      },
      {
        name: "aget_get_post",
        description: "根据 ID 获取单条优惠信息的详情（含标签）",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "优惠信息的数字 ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "aget_list_my_posts",
        description: "获取我发布的优惠信息列表（分页，每页 20 条），需要配置 AGET_API_TOKEN",
        inputSchema: {
          type: "object",
          properties: {
            page: {
              type: "number",
              description: "页码（默认 1）",
            },
          },
        },
      },
      {
        name: "aget_list_tags",
        description: "获取 aget.cc 的标签短语列表（含 ID），用于发布时选择 tagIds",
        inputSchema: {
          type: "object",
          properties: {
            featuredOnly: {
              type: "boolean",
              description: "是否只返回首页展示的热门标签（默认 false）",
            },
          },
        },
      },
    ],
  };
});

// Tool Execution Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args || {}) as any;

  try {
    if (name === "aget_get_profile") {
      const data = await apiRequest("/api/v1/me");
      return {
        content: [
          {
            type: "text",
            text: `✅ 身份验证成功！\n用户: @${data.uid}\n邮箱: ${data.email}\n角色: ${data.role}\n注册时间: ${data.createdAt ? new Date(data.createdAt).toLocaleString("zh-CN") : "未知"}\n已发布: ${data.postCount} 条`,
          },
        ],
      };
    }

    if (name === "aget_create_post") {
      const body: any = { title: String(a.title || ""), content: String(a.content || "") };
      if (a.expiresAt) body.expiresAt = String(a.expiresAt);
      if (Array.isArray(a.tagIds)) body.tagIds = a.tagIds;

      const data = await apiRequest("/api/v1/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let detail = "";
      try {
        const post = await apiRequest(`/api/v1/posts/${data.id}`);
        if (post?.pid) detail = `\n🔗 详情链接: ${BASE_URL}/d/${post.pid}`;
      } catch {
        /* ignore */
      }

      return {
        content: [
          {
            type: "text",
            text: `🎉 优惠信息发布成功！\n🆔 ID: ${data.id}${detail}`,
          },
        ],
      };
    }

    if (name === "aget_list_deals") {
      const params = new URLSearchParams();
      const tab = ["today", "yesterday", "week", "all"].includes(a.tab) ? a.tab : "today";
      params.set("tab", tab);
      if (a.q) params.set("q", String(a.q).slice(0, 100));
      if (a.tag) params.set("tag", encodeURIComponent(String(a.tag).toLowerCase().slice(0, 30)));
      if (a.page) params.set("page", String(Math.max(1, parseInt(String(a.page), 10) || 1)));

      const data = await apiRequest(`/api/posts?${params.toString()}`, {}, false);
      return jsonResult({
        时间范围: tab,
        总数: data.total,
        页码: `${data.page}/${data.totalPages}`,
        items: data.items,
      });
    }

    if (name === "aget_get_post") {
      const id = parseInt(String(a.id), 10);
      if (!Number.isInteger(id)) {
        return { isError: true, content: [{ type: "text", text: "参数错误：id 必须是数字" }] };
      }
      const data = await apiRequest(`/api/v1/posts/${id}`);
      return jsonResult(data);
    }

    if (name === "aget_list_my_posts") {
      const page = Math.max(1, parseInt(String(a.page || "1"), 10) || 1);
      const data = await apiRequest(`/api/v1/me/posts?page=${page}`);
      return jsonResult(data);
    }

    if (name === "aget_list_tags") {
      const featured = a.featuredOnly ? "?featured=1" : "";
      const data = await apiRequest(`/api/public/tags${featured}`, {}, false);
      return jsonResult(
        (data.items || []).map((t: any) => ({ id: t.id, phrase: t.phrase, tags: t.tags }))
      );
    }

    return {
      isError: true,
      content: [{ type: "text", text: `未知工具: ${name}` }],
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `执行异常: ${error.message || String(error)}` }],
    };
  }
});

// Run Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Aget MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error in MCP Server:", err);
  process.exit(1);
});
