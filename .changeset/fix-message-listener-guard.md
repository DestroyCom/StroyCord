---
"stroycord": patch
---

Fix message listener processing unrelated messages when DETECT_FROM_ALL_MESSAGES is set. Parse env var as boolean properly (string "false" no longer treated as truthy). Only delete messages for recognized commands.
