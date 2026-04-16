---
name: new-command
description: Scaffold a new Discord slash command following StroyCord conventions
disable-model-invocation: false
---

Create a new slash command in src/commands/slashCommands/<name>.ts following the existing pattern:

1. Read src/commands/slashCommands/pause.ts as the structural template
2. Scaffold the new file with proper i18n, voice state validation, and error handling
3. Export from src/commands/slashCommands/index.ts
4. Register in deploy-commands.ts if needed

Ask the user for: command name, description, and what it should do.
