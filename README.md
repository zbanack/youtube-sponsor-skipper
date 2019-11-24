# youtube-sponsor-skipper
Browser extension that skips through YouTube in-video sponsored segments by comparing closed captions against defined trigger words.

![Demo of extension](https://github.com/zbanack/youtube-sponsor-skipper/blob/master/promo.gif?raw=true)

## How it works
- Ever x seconds read the video captions
- If a `trigger` word is found in close proximity to a form of the word "sponsor", then we enter into a sponsored segment
- While in a sponsored segment, if the trigger word is re-encountered _or_ we encounter a word from the `in-ad` list, keep skimming through the video

Initial author - [Zack Banack](https://www.zackbanack.com/)

[Buy me a coffee ☕](https://www.paypal.me/zackbanack)
