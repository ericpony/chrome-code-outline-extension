# A code outline viewer for GitHub
This is a Chrome extension that provides GitHub code viewer with an overview of the code structure. Currently, this extension attaches "Go to definition" links to variable and function names in the source code, see [this page](https://sourcegraph.com/github.com/feross/webtorrent@1dc0921d55f0015fa80e141e0af1c04e962ad65a/.tree/lib/torrent.js) in [Sourcegraph](https://sourcegraph.com) for example. It will not support type inference as Sourcegraph does, because I haven't found a good way to do it fully in the front end. A more reasonable goal for this extension by now is to display something like the sidebar of [Tagbar](https://github.com/majutsushi/tagbar) when you are browsing source codes in GitHub:

<center>
![](https://camo.githubusercontent.com/fc85311154723793776aed28488befdfaab36c42/68747470733a2f2f692e696d6775722e636f6d2f5366394c7332722e706e67)
</center>

The above screenshot, borrowed from [Tagbar](https://github.com/majutsushi/tagbar) , shows what's in my mind when I am designing the extension. I will provide my own screenshot when the extension is mature enough.

This project is derived from another [project](https://github.com/ericpony/highlight.js) of mine, and is still at an early stage of development. Please feel free to fork this project, or just tell me there is already a similar project around!

## Usage

Currently, this extension supports three languages that I work with most frequently: JavaScript, Scala and Bash. When you are browsing source codes written in these languages, you can click "Analysis" in the context menu to attach links in the pages.

## License

GPL v3


