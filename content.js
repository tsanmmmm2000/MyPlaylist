// 0:Youtube 1:SoundCloud 2:Spotify
var currentType;
var currentTitle;
var currentVideoId;
var youtubePrefix = "www.youtube";
var soundcloudPrefix = "soundcloud";
var spotifyPrefix = "play.spotify";
var soundcloudClientId = "b7e3abba5291e3dff24f938e7e642564";

(function (){
	Initialize();
	chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {
		if (msg.action == 'InitButton') {
			// Wait to render for SoundCloud
			setTimeout(Initialize, 3000);
		} else if (msg.action == 'contextMenu') {
            HandleContextMenuAction(msg.info);
        }
    });
}());

function HandleContextMenuAction(info) {
    var pageUrl = info.pageUrl;
    var linkUrl = info.linkUrl;  
    if (pageUrl.startsWith("https://" + youtubePrefix)) {
        if (linkUrl != null && linkUrl != undefined) {
            currentType = 0;
            currentVideoId = linkUrl.split('=')[1];
            var targetIndex = linkUrl.lastIndexOf("/");
			var path = linkUrl.substring(targetIndex);
			currentTitle = $(".ytd-compact-video-renderer a[href='" + path + "']").find("#video-title").attr("title");
			if (currentVideoId != undefined && currentTitle != undefined) AddToPlaylist();
        } else {
            var targetIndex = pageUrl.lastIndexOf("/");
            var path = pageUrl.substring(targetIndex);
            if (path != "/") {
                currentType = 0;
                currentVideoId = pageUrl.split('=')[1];
				currentTitle = $("#container h1").first().text();
                if (currentVideoId != undefined && currentTitle != undefined) AddToPlaylist();
             }
        }
    } else if (pageUrl.startsWith("https://" + soundcloudPrefix)) {
        if (linkUrl != null && linkUrl != undefined) {
		  if (IsAvailablePath(linkUrl)) {
			$.get('https://api.soundcloud.com/resolve.json?url=' + linkUrl + '/tracks&client_id=' + soundcloudClientId , function (result) {
				currentType = 1;			    
				currentVideoId = result.id;
				currentTitle = result.title;
				if (currentVideoId != undefined && currentTitle != undefined) AddToPlaylist();
				}).fail(function(result) { 
				console.log(result);
			});			  
		  }
        } else {
            if (IsAvailablePath(pageUrl)) {
	            $.get('https://api.soundcloud.com/resolve.json?url=' + pageUrl + '/tracks&client_id=' + soundcloudClientId , function (result) {
			        currentType = 1;
			        currentVideoId = result.id;
			        currentTitle = result.title;
				   if (currentVideoId != undefined && currentTitle != undefined) AddToPlaylist();
		        }).fail(function(result) { 
				   console.log(result);
			   });
            }
        }
    }
}

function AddToPlaylist() {
    var typeWithVideoId = currentType + "_" + currentVideoId;
	var key = new Date().getTime() + "_" + typeWithVideoId;
	chrome.storage.local.get('MyPlaylist', function(result) { 
		if(result.MyPlaylist != undefined && result.MyPlaylist != null) {	
			var playlist = result.MyPlaylist;
			if (!CheckValueExist(playlist, typeWithVideoId)) {		
				playlist[key] = currentTitle;
				chrome.storage.local.set({'MyPlaylist': playlist});	
			}
		} else {
			var playlist = {};		
			playlist[key] = currentTitle;
			chrome.storage.local.set({'MyPlaylist': playlist});	
		}
        Notify(currentTitle);
	});	
}

function Notify(title) {
     if (Notification.permission !== "granted")
		Notification.requestPermission();
     else {
		var notification = new Notification('Add Success', {
			icon: 'https://myplaylist.azurewebsites.net/logo.png',
			body: title
		});
    }
}

function CheckValueExist(playlist, typeWithVideoId) {
    var isExist = false;
	$.each(playlist, function(i,n){
		var splitIndex = i.indexOf('_');
		var targetId = i.substring(splitIndex + 1);
		if (targetId == typeWithVideoId) {
			isExist = true;
			return false;
		}
    });
    return isExist;
}

function Lazy(element, callback) {
	var checkExist = setInterval(function() {
		if (IsElementCreated(element)) {
			clearInterval(checkExist);
			if(typeof callback === 'function') {
				callback();
			}
		}
	 }, 3000);
}

function Initialize() {
	var url = location.hostname;
	if (url.startsWith(youtubePrefix)){	
		Lazy($("#page-manager ytd-watch-flexy"), function() {
			currentType = 0;
			currentVideoId = $("#page-manager ytd-watch-flexy").attr("video-id");
			currentTitle = $("#container h1").first().text();
			CreateYoutubeButton();
			BindAddEvent();	
		});
	} else if (url.startsWith(soundcloudPrefix) && IsAvailablePath(location.pathname)) {
		// Use api        
		// Some tracks would return 403(forbidden) error. This issue might cause by the client id.
		// More info: http://stackoverflow.com/questions/36515127/soundcloud-api-returns-403-error-on-some-track-info
		// More info: http://stackoverflow.com/questions/36360202/soundcloud-api-urls-timing-out-and-then-returning-error-403-on-about-50-of-trac?rq=1	
		var permalink = location.href;
		$.get('https://api.soundcloud.com/resolve.json?url=' + permalink + '/tracks&client_id=' + soundcloudClientId , function (result) {
			currentVideoId = result.id;
			currentTitle = result.title;
			currentType = 1;
			CreateSoundCloudButton();
			BindAddEvent();				
		}).fail(function(result) {
			console.log(result);			
		});
	} else if (url.startsWith(spotifyPrefix)){
		currentType = 2;
		CreateSpotifyButton();
		BindAddEvent();			
	}
}

function IsElementCreated(element) {
	return (element != null && element != undefined && !$.isEmptyObject(element));
}

function IsAvailablePath(path) {
    var blackList = ["/stream","/sets","/discover","/charts","/you","/upload","/pages","/terms-of-use",
	"/messages","/mobile","/settings","/about","/channels","/discussion","/playlists","/videos","/featured"];
    var reg = new RegExp(blackList.join("|"), "i");
    return (path.match(reg) == null);
}

function BindAddEvent() {
    $("#btnAdd").click(function() {
		AddToPlaylist();
	});

	/* Popup Mode
     // Inform the background page that this tab should have a page-action
	chrome.runtime.sendMessage({
		from: 'content',
		subject: 'showPageAction'
	});
	*/
}

function CreateYoutubeButton() {
	$("#btnAdd").parent().remove();
	var actionBar = $("#meta-contents div[id='top-row']");
	var addElements = "";
	addElements += "<div class=\"style-scope ytd-video-secondary-info-renderer\" style=\"display:flex;\">";
	addElements += "<paper-button id=\"btnAdd\" type=\"button\" class=\"style-scope ytd-subscribe-button-renderer\" title=\"Add To My Playlist\" subscribed>";
	addElements += "<img src=\"https://myplaylist.azurewebsites.net/logo.png\" style=\"width:14px; height:14px; display:inline-block; margin-right:5px;\">";        
	addElements += "<span>Add To My Playlist</span>";		
	addElements += "</paper-button>";
	addElements += "</div>";
	actionBar.append(addElements);
}

function CreateSoundCloudButton(){
	$("#btnAdd").remove();
	var actionBar = $(".sc-button-group-medium:first");
	var addElements = "";
	addElements += "<button id=\"btnAdd\" type=\"button\" class=\"sc-button sc-button-medium sc-button-responsive\" title=\"Add To My Playlist\">";
	addElements += "<img src=\"https://myplaylist.azurewebsites.net/logo.png\" style=\"width:14px; height:14px; display:inline-block; margin-right:5px; vertical-align: middle;\">";    
	addElements += "<span style=\"vertical-align: middle;\">Add To My Playlist</span>";    
	addElements += "</button>";
	actionBar.append(addElements);
}
/* Spotify Button
function CreateSpotifyButton() {
	$("#btnAdd").remove();
	var actionBar = $(".extra");
	var addElements = "";
	addElements += "<button id=\"btnAdd\" type=\"button\" title=\"Add To My Playlist\">";
	addElements += "Add To My Playlist";
	addElements += "</button>";
	actionBar.append(addElements);
}
*/