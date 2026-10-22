---
"stroycord": minor
---

SoundCloud support (tracks, sets / albums, private and short links; Go+ tracks, only available as 30 s previews, are refused instead of played cut) and working YouTube playlists: the playlist id is now passed to YouTube (the full URL made every playlist fail), every page is read (not only the first 100 videos) and a playlist that can't be loaded is reported. A video carrying its auto-generated mix (`list=RD…`) plays alone instead of queueing the radio.
