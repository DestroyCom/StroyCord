---
"stroycord": patch
---

Fix InteractionNotReplied crash on slash commands (skip, pause, resume, redo, current, remove, queue) by awaiting `interaction.reply()` before calling `interaction.deleteReply()`.
