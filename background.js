chrome.contextMenus.removeAll();
chrome.contextMenus.create({
	id    : 'parse',
	title : "Analysis (&A)",
	type  : "normal",
	contexts : ['all'],
	onclick: function (info, tab) {
		chrome.tabs.executeScript(null, {file: 'lib/jquery-1.11.2.min.js'}, function() {
			chrome.tabs.executeScript(null, {file: 'outliner.js'});
		});
	}
});

