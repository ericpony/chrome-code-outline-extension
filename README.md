# A code outline viewer for GitHub
This is a Chrome extension that provides GitHub code viewer with an overview of the code structure. Currently, this extension attaches "Go to definition" links to variable and function names in the source code, see [this page](https://sourcegraph.com/github.com/feross/webtorrent@1dc0921d55f0015fa80e141e0af1c04e962ad65a/.tree/lib/torrent.js) in [Sourcegraph](https://sourcegraph.com) for example. This project is derived from another [project](https://github.com/ericpony/highlight.js) of mine, and is still at an early stage of development. Please feel free to fork it, or just tell me there is already a similar project around!

## Usage

Three languages that I work most frequently with are supported for now: JavaScript, Scala and Bash. When you are browsing source codes written in these languages, you can click "Analyze" in the context menu to generate go-to-definition links. Note that the extension only searches for definitions appearing in the same page, i.e., it doesn't generate cross-page links. Also, depending on how the code is organized, the links may not be very accurate because the parser is not thorough.

## Discussion
[Sourcegraph](https://sourcegraph.com) is superb, but it doesn't support Scala currently. Besides, Sourcegraph performs analysis in the serve side. You have to wait in a long long priority queue after you request the server to analyze a project, which would take forever if the project is unpopular. (None of mine projects got analyzed by Sourcegraph though I made requests months ago.) However, Sourcegraph is still the best choice when you want to browsing large and popular projects written in Python, Java, Go, etc. I hope I could reproduce as many features of Sourcegraph as possible in this extension. On the other hand, I am not planning to support type inference as Sourcegraph does, because I haven't found a good way to do it fully in the front end. A more reasonable goal for this extension by now is to display something like the sidebar of [Tagbar](https://github.com/majutsushi/tagbar) in your browser when you are viewing source codes in GitHub.

<center>
![](https://camo.githubusercontent.com/fc85311154723793776aed28488befdfaab36c42/68747470733a2f2f692e696d6775722e636f6d2f5366394c7332722e706e67)
</center>

The above screenshot, borrowed from [Tagbar](https://github.com/majutsushi/tagbar), shows what's in my mind when I am designing the sidebar. I will provide my own screenshot when the extension is mature enough.


## License

GPL v3


