# computer-use-mcp

💻 An model context protocol server for Claude to control your computer. This is very similar to [computer use](https://docs.anthropic.com/en/docs/build-with-claude/computer-use), but easy to set up and use locally.

Here's Claude Haiku 4.5 changing my desktop background (4x speed):

https://github.com/user-attachments/assets/cd0bc190-52c4-49db-b3bc-4b8a74544789

> [!WARNING]
> At time of writing, models make frequent mistakes and are vulnerable to prompt injections. As this MCP server gives the model complete control of your computer, this could do a lot of damage. You should therefore treat this like giving a hyperactive toddler access to your computer - you probably want to supervise it closely, and consider only doing this in a sandboxed user account.

## Installation

<details>
<summary><strong>Claude Code</strong></summary>

Run:

```bash
claude mcp add --scope user --transport stdio computer-use -- npx -y computer-use-mcp
```

This installs the server at user scope (available in all projects). To install locally (current directory only), omit `--scope user`.

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

#### (Recommended) Via manual .dxt installation

1. Find the latest dxt build in [the GitHub Actions history](https://github.com/domdomegg/computer-use-mcp/actions/workflows/dxt.yaml?query=branch%3Amaster) (the top one)
2. In the 'Artifacts' section, download the `computer-use-mcp-dxt` file
3. Rename the `.zip` file to `.dxt`
4. Double-click the `.dxt` file to open with Claude Desktop
5. Click "Install"

#### (Advanced) Alternative: Via JSON configuration

1. Install [Node.js](https://nodejs.org/en/download)
2. Open Claude Desktop and go to Settings → Developer
3. Click "Edit Config" to open your `claude_desktop_config.json` file
4. Add the following configuration to the "mcpServers" section:

```json
{
  "mcpServers": {
    "computer-use": {
      "command": "npx",
      "args": [
        "-y",
        "computer-use-mcp"
      ]
    }
  }
}
```

5. Save the file and restart Claude Desktop

</details>

<details>
<summary><strong>Cursor</strong></summary>

#### (Recommended) Via one-click install

1. Click [![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=computer-use&config=JTdCJTIyY29tbWFuZCUyMiUzQSUyMm5weCUyMC15JTIwY29tcHV0ZXItdXNlLW1jcCUyMiU3RA%3D%3D)

#### (Advanced) Alternative: Via JSON configuration

Create either a global (`~/.cursor/mcp.json`) or project-specific (`.cursor/mcp.json`) configuration file:

```json
{
  "mcpServers": {
    "computer-use": {
      "command": "npx",
      "args": ["-y", "computer-use-mcp"]
    }
  }
}
```

</details>

<details>
<summary><strong>Cline</strong></summary>

#### (Recommended) Via marketplace

1. Click the "MCP Servers" icon in the Cline extension
2. Search for "Computer Use" and click "Install"
3. Follow the prompts to install the server

#### (Advanced) Alternative: Via JSON configuration

1. Click the "MCP Servers" icon in the Cline extension
2. Click on the "Installed" tab, then the "Configure MCP Servers" button at the bottom
3. Add the following configuration to the "mcpServers" section:

```json
{
  "mcpServers": {
    "computer-use": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "computer-use-mcp"]
    }
  }
}
```

</details>

## Tips

This should just work out of the box.

However, to get best results:
- Use a model good at computer use - I recommend [the latest Claude models](https://platform.claude.com/docs/en/about-claude/models/overview).
- Use a small, common resolution - 720p works particularly well. On macOS, you can use [displayoverride-mac](https://github.com/domdomegg/displayoverride-mac) to do this. If you can't use a different resolution, try zooming in to active windows.
- Install and enable the [Rango browser extension](https://chromewebstore.google.com/detail/rango/lnemjdnjjofijemhdogofbpcedhgcpmb). This enables keyboard navigation for websites, which is far more reliable than Claude trying to click coordinates. You can bump up the font size setting in Rango to make the hints more visible.

## How it works

We implement a near identical computer use tool to [Anthropic's official computer use guide](https://docs.anthropic.com/en/docs/build-with-claude/computer-use), with some more nudging to prefer keyboard shortcuts.

This talks to your computer using [nut.js](https://github.com/nut-tree/nut.js)

## Contributing

Pull requests are welcomed on GitHub! To get started:

1. Install Git and Node.js
2. Clone the repository
3. Install dependencies with `npm install`
4. Run `npm run test` to run tests
5. Build with `npm run build`

## Releases

Versions follow the [semantic versioning spec](https://semver.org/).

To release:

1. Use `npm version <major | minor | patch>` to bump the version
2. Run `git push --follow-tags` to push with tags
3. Wait for GitHub Actions to publish to the NPM registry.
