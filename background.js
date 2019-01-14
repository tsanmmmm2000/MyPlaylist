/*  Popup Mode
chrome.runtime.onMessage.addListener(function (msg, sender) {
  // First, validate the message's structure
  if ((msg.from === 'content') && (msg.subject === 'showPageAction')) {
    // Enable the page-action for the requesting tab
    chrome.pageAction.show(sender.tab.id);
  }
});
*/

var vid;

chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
    if(details.frameId === 0) {
        // Fires only when details.url === currentTab.url
        chrome.tabs.get(details.tabId, function(tab) {
			if (chrome.runtime.lastError) {
				console.log(chrome.runtime.lastError.message);
			} else {
				if(tab.url === details.url) {
					chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
						chrome.tabs.sendMessage(tabs[0].id, {action: "InitButton"}, function(response) {});  
					});	
				}
			}
        });
    }
});

chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.windows.getAll({}, function(list) {
		var isWindowExist = false; 
		for(var i = 0; i < list.length; i++) { 
			if (list[i].id == vid) {
				isWindowExist = true;
				break;
			}
		}
		
		if (isWindowExist) {
			chrome.windows.update(vid, {focused: true}); 
			return;
		}	
		
		var windowWidth = 610;
		var windowHeight = 450;
		chrome.windows.create({	
			'url': 'https://myplaylist.azurewebsites.net/list.html',
			'width':  windowWidth,
			'height': windowHeight,
			'left': screen.availWidth - windowWidth,
			'type': 'popup',
		}, function(window) { vid = window.id; });
	});	
});

chrome.contextMenus.onClicked.addListener(OnClickHandler);
//chrome.runtime.onInstalled.addListener(function (details) {
    chrome.contextMenus.create({
        type: 'normal',
        title: 'Add To My Playlist',
        id: 'contextMenuItem',
        contexts: ['page','link'],
	    documentUrlPatterns: ['https://soundcloud.com/*','https://www.youtube.com/*']
    }, function () {});
//});

function OnClickHandler(info, tab) {
    chrome.tabs.sendMessage(tab.id, {action: "contextMenu", info: info }, function(response) {}); 
}
