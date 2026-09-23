# aget-mcp

[aget.cc](https://aget.cc)（阿集 · 优惠合集站）的 MCP Server，让 AI 助手可以查看个人信息、发布与管理优惠信息、查询最新优惠与心愿单需求。

基于 [Model Context Protocol](https://modelcontextprotocol.io)（stdio 传输）。

## 功能列表

| 工具 | 说明 | 认证 |
|---|---|---|
| `aget_get_profile` | 获取个人信息（UID、邮箱、角色、注册时间、发布数量） | 需要 Token |
| `aget_create_post` | 发布优惠信息（支持标签数组 `tags`、过期时间 `expiresAt`） | 需要 Token |
| `aget_delete_post` | 删除自己发布的某条优惠信息 | 需要 Token |
| `aget_list_deals` | 查询公开优惠：`today` / `yesterday` / `week` / `all`，支持关键词与标签筛选 | 公开 |
| `aget_list_latest` | 获取最新 20 条优惠列表（含标签与作者公开信息） | 需要 Token |
| `aget_get_post` | 根据 ID 获取单条优惠详情 | 需要 Token |
| `aget_list_my_posts` | 获取我发布的优惠列表（支持分页） | 需要 Token |
| `aget_list_tags` | 获取标签与短语列表（用于发布或筛选时参考） | 公开 |
| `aget_list_wishes` | 查询公开心愿池列表（用户求优惠、求折扣需求） | 公开 |

## 获取 API Token

登录 aget.cc 后在「个人设置 - API Token」中生成 Token（格式 `agt_...`），或调用：

```http
POST /api/me/token
```

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `AGET_API_TOKEN` | API Token（需要认证的工具必须配置） | 空 |
| `AGET_BASE_URL` | API 服务端根地址（方便本地联调或私有化部署） | `https://aget.cc` |

### Claude Desktop / Cursor / Antigravity 配置

在客户端 MCP 配置文件中添加：

```json
{
  "mcpServers": {
    "aget": {
      "command": "node",
      "args": ["/path/to/aget-mcp/dist/index.js"],
      "env": {
        "AGET_API_TOKEN": "agt_xxxxxxxxxxxxxxxx",
        "AGET_BASE_URL": "https://aget.cc"
      }
    }
  }
}
```

### 本地开发与构建

```bash
# 安装依赖
npm install

# 编译构建
npm run build

# 测试运行
AGET_API_TOKEN=agt_xxx node dist/index.js
```

## 对应的 aget.cc API

| MCP 工具 | 接口与路由 |
|---|---|
| `aget_get_profile` | `GET /api/v1/me` |
| `aget_create_post` | `POST /api/v1/posts` |
| `aget_delete_post` | `DELETE /api/posts/:id` |
| `aget_list_deals` | `GET /api/posts?tab=today\|yesterday\|week\|all&q=&tag=&page=` |
| `aget_list_latest` | `GET /api/v1/posts/latest` |
| `aget_get_post` | `GET /api/v1/posts/:id` |
| `aget_list_my_posts` | `GET /api/v1/me/posts?page=` |
| `aget_list_tags` | `GET /api/public/tags` |
| `aget_list_wishes` | `GET /api/wishes?q=&page=` |

## License

[MIT](LICENSE)
