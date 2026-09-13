# Aura web plugin

This package contains the client bundle and host entry point for DeepSeek Harness Aura. See the [project README](../../README.md) for features, setup, model-routing limits and tests.

To install it in a Harness web profile, copy this directory to `<profile>/packages/dsh-ui-aura` and add this row to the profile's `cordis.patch.yml` without removing its other entries:

```yaml
- insert:
    - id: ui-aura
      name: ./packages/dsh-ui-aura/lib/index.js
```

Refresh the Harness web page after installation. No build or package install is required. The browser holds workflow recipes in local storage; Harness holds provider credentials.
