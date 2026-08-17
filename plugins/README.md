# Lazy Frames plugins

Each direct child folder is one independently maintainable plugin. To contribute:

1. Copy an existing folder and rename it to your plugin ID.
2. Edit only that folder's `manifest.json` and add adapter files there when the runtime is implemented.
3. Run `npm run plugins:build` to validate every manifest and regenerate the marketplace.
4. Run `npm run build` and test `lazy plugin search <id>` plus `lazy plugin install <id>`.

The folder name must exactly match `manifest.json#id`. Unknown fields are rejected. Plugins cannot request undeclared capabilities, environment variables, network hosts, or filesystem scopes.

`status: "scaffold"` means the plugin can be discovered and installed as a locked manifest, but cannot execute until a reviewed adapter ships. Only `status: "available"` with a `builtin` runtime can execute.
