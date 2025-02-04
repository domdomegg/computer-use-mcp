# computer-use-mcp

💻 An model context protocol server for Claude to control your computer. This is very similar to [computer use](https://docs.anthropic.com/en/docs/build-with-claude/computer-use), but easy to set up and use locally.

<!-- TODO: demo video -->

To get best results:
- Install and enable the [Rango browser extension](https://chromewebstore.google.com/detail/rango/lnemjdnjjofijemhdogofbpcedhgcpmb). This enables keyboard navigation for websites, which is far more reliable than Claude trying to click coordinates.
- On high resolution displays, consider zooming in to active windows. You can also bump up the font size setting in Rango to make the text more visible.

> [!WARNING]
> At time of writing, models make frequent mistakes and are vulnerable to prompt injections. As this MCP server gives the model complete control of your computer, this could do a lot of damage. You should therefore treat this like giving a hyperactive toddler access to your computer - you probably want to supervise it closely, and consider only doing this in a sandboxed user account.

## How it works

We implement a near identical computer use tool to [Anthropic's official computer use guide](https://docs.anthropic.com/en/docs/build-with-claude/computer-use), with some more nudging to prefer keyboard shortcuts.

This talks to your computer using [nut.js](https://github.com/nut-tree/nut.js).

## Usage

To use this server with the Claude Desktop app, add the following configuration to the "mcpServers" section of your `claude_desktop_config.json`:

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
