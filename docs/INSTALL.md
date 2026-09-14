# Install Aura in DeepSeek Harness

Aura currently ships as source. These instructions install the web plugin in an existing local DeepSeek Harness profile. It does not contain DeepSeek Harness itself or model credentials.

## Windows PowerShell

1. Download the repository ZIP from GitHub and extract it, or clone the repository. In the commands below, replace `C:\path\to\deepseek-harness-aura` with that extracted folder.
2. Run these commands while the Harness web process is stopped:

   ```powershell
   $source = 'C:\path\to\deepseek-harness-aura'
   $dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
   $profile = Join-Path $dshHome 'profiles\web'
   $package = Join-Path $profile 'packages\dsh-ui-aura'
   New-Item -ItemType Directory -Force -Path $package | Out-Null
   Copy-Item -Path (Join-Path $source 'packages\dsh-ui-aura\*') -Destination $package -Recurse -Force
   # Install the host dependency (schemastery) and rebuild the generated bootstrap:
   Push-Location $package
   npm install --ignore-scripts
   npm run build
   Pop-Location
   ```

3. Open `<DSH_HOME>/profiles/web/cordis.patch.yml`. Add this top-level list item, preserving other entries. If the file does not exist, create it with only this item:

   ```yaml
   - insert:
       - id: ui-aura
         name: ./packages/dsh-ui-aura/lib/host.js
   ```

   If `ui-aura` is already present, keep one copy rather than adding a duplicate. The relative `name` above is resolved from the web profile. (`lib/index.js` re-exports `lib/host.js`, but the profile mounts the host entry directly.)

4. Restart Harness web as usual (`npx @deepseek-ai/dsh web` for the standard CLI) while no turn is running, refresh the browser and open **Workflow → Open Aura Studio**.

## macOS and Linux

Copy the repository's `packages/dsh-ui-aura` directory into `${DSH_HOME:-$HOME/.dsh}/profiles/web/packages/`, run `npm install --ignore-scripts` and `npm run build` inside it, add the same `lib/host.js` patch item to the web profile's `cordis.patch.yml`, then restart Harness web and refresh the page. Preserve any other patch entries.

## Verify and remove

From the repository root, run `npm run build` then `npm test` with Node.js 22 or newer. These tests do not call a model. The optional settings integration test runs against an installed Harness: `node packages/dsh-ui-aura/scripts/test-settings.mjs <installed-node_modules>` (it uses a synthetic temporary settings document, never your real settings). For a live check, open Aura Studio in a new Harness conversation, inspect the available model list, and test a recipe only if your provider quota permits it. A message being accepted is not proof that the model ran the workflow; inspect the actual Harness agent activity.

To remove Aura, stop Harness web, remove the `ui-aura` patch item, delete the copied `packages/dsh-ui-aura` directory from the profile, then restart Harness web. Recipes stored in the browser's local storage are separate from the plugin files.

If the web page fails to start, first check YAML indentation and that `packages/dsh-ui-aura/lib/host.js` exists in the web profile. Report reproducible bugs through [GitHub Issues](https://github.com/iamhariize-maker/deepseek-harness-aura/issues); do not attach credentials or private conversations.
