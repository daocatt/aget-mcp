# aget-mcp

[aget.cc](https://aget.cc)（阿集 · 优惠合集站）的 MCP Server，让 AI 助手可以查看个人信息、发布优惠信息、获取今日/昨日/本周优惠。

基于 [Model Context Protocol](https://modelcontextprotocol.io)（stdio 传输），参考 `jotify-moment-mcp` 实现。

## 功能

| 工具 | 说明 | 认证 |
|---|---|---|
| `aget_get_profile` | 获取个人信息（UID、邮箱、角色、发布数量） | 需要 Token |
| `aget_create_post` | 发布一条优惠信息（支持过期时间、标签） | 需要 Token |
| `aget_list_deals` | 获取优惠列表：`today` / `yesterday` / `week` / `all`，支持关键词与标签筛选 | 公开 |
| `aget_get_post` | 根据 ID 获取单条优惠详情 | 需要 Token |
| `aget_list_my_posts` | 获取我发布的优惠（分页） | 需要 Token |
| `aget_list_tags` | 获取标签短语列表（用于发布时选择 tagIds） | 公开 |

## 获取 API Token

登录 aget.cc 后在「个人设置」中生成 API Token（格式 `agt_...`），或调用：

```
POST /api/me/token
```

## 配置

环境变量：

- `AGET_API_TOKEN`：API Token（必填，查询/发布个人数据时需要）

API 地址固定为 `https://aget.cc`，无需配置。

### Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "aget": {
      "command": "node",
      "args": ["/path/to/aget-mcp/dist/index.js"],
      "env": {
        "AGET_API_TOKEN": "agt_xxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### 本地开发

```bash
npm install
npm run build
AGET_API_TOKEN=agt_xxx node dist/index.js
```

## 对应的 aget.cc API

| MCP 工具 | API |
|---|---|
| `aget_get_profile` | `GET /api/v1/me` |
| `aget_create_post` | `POST /api/v1/posts` |
| `aget_list_deals` | `GET /api/posts?tab=today\|yesterday\|week\|all&q=&tag=&page=` |
| `aget_get_post` | `GET /api/v1/posts/:id` |
| `aget_list_my_posts` | `GET /api/v1/me/posts?page=` |
| `aget_list_tags` | `GET /api/public/tags` |

## License

MIT
