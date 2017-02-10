// 0:無 1:單曲重播 2:循環重播 3:隨機播放
var currentMode = 0;
// 0:Youtube 1:SoundCloud 2:Spotify
var currentType = 0;
var currentVideoId;
var youtubePattern = "https://www.youtube.com/embed/{videoId}?enablejsapi=1&autoplay=1";
var soundcloudPattern = "https://w.soundcloud.com/player/?url=https://api.soundcloud.com/tracks/{videoId}&auto_play=true&hide_related=true";
var spotifyPattern = "https://embed.spotify.com/?uri=spotify:track:{videoId}";
var soundcloudPlayer;
var youtubePlayer;
(function() {
    WriteList();
    $(window).resize(function() {
        var newWidth = $(window).width() - 30;
        $("body").width(newWidth)
    });
    $("#replay").click(function() {
        Toggle($(this), 1)
    });
    $("#loop").click(function() {
        Toggle($(this), 2)
    });
    $("#shuffle").click(function() {
        Toggle($(this), 3)
    });
    $("#reload").click(function() {
        location.reload()
    });
    $("#clear").click(function() {
        if (confirm("Are you sure you want to remove all tracks?")) {
            chrome.storage.local.remove('MyPlaylist');
            $("#myList").empty();
            $("#player").attr("src", "");
            WriteList()
        }
    });
    $(window).trigger('resize')
}());

function Toggle(thisObj, thisMode) {
    var modeId = "";
    if (thisObj.hasClass("selected")) {
        currentMode = 0;
        $(thisObj).removeClass("selected")
    } else {
        currentMode = thisMode;
        $(".mode").removeClass("selected");
        $(thisObj).addClass("selected");
        modeId = thisObj[0].id
    }
    var expires = new Date();
    expires.setTime(expires.getTime() + 172800000);
    var settings = {
        Id: currentVideoId,
        Type: currentType,
        ModeId: modeId
    };
    DelCookie("MyPlaylistSettings");
    DoCookieSetup("MyPlaylistSettings", JSON.stringify(settings), expires)
}

// Init Youtube
function onYouTubeIframeAPIReady() {
    SetYoutubeInstance()
};

function onYTPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        Action()
    }
};

function SetYoutubeInstance() {
    youtubePlayer = new YT.Player('player', {
        events: {
            'onStateChange': onYTPlayerStateChange
        }
    })
}
// Init SoundCloud
var isSoundCloudReady = false;
function InitSoundCloud() {
    soundcloudPlayer = SC.Widget('player');
    soundcloudPlayer.bind(SC.Widget.Events.FINISH, function() {
        Action()
    })
}

function SetSoundCloudInstance() {
    var url = "https://api.soundcloud.com/tracks/{videoId}";
    url = url.replace("{videoId}", currentVideoId);
    var options = [];
    options.auto_play = true;
    options.hide_related = true;
    soundcloudPlayer.load(url, options)
}

// Init Spotify
function SetSpotifyInstance() {
	//Todo
}

function WriteList() {
    chrome.storage.local.get('MyPlaylist', function(result) {
        var playlist = result.MyPlaylist;
        if (playlist != null && playlist != undefined && !$.isEmptyObject(playlist)) {
            var item = "";
            $.each(playlist, function(i, n) {
                var splitIndex = GetXIndexOf('_', i, 2);
                var type = parseInt(i.substring(splitIndex - 1, splitIndex));
                item += "<li class=\"icon-" + type + "\">";
                item += "<div id=\"" + i + "\" class=\"btnShow autoSkip\" title=\"" + n + "\">" + n + "</div>";
                item += "<img class=\"btnRemove\" src=\"cross.png\" title=\"Remove\" border=\"0\" style=\"float:right; display:none; margin-right:10px;\"/>";
                item += "</li>"
            });
            $("#myList").append(item);
            $(".btnRemove").click(function() {
                var key = $(this)[0].previousElementSibling.id;
                $(this).parent().remove();
                chrome.storage.local.remove('MyPlaylist');
                delete playlist[key];
                chrome.storage.local.set({
                    'MyPlaylist': playlist
                })
            });
            $("li").mouseover(function() {
                $(this).children().eq(1).show()
            }).mouseout(function() {
                $(this).children().eq(1).hide()
            });
			
            $(".btnShow").click(function() {
			// Naming: [Ticks]_[Type]_[VideoId]
                var elementId = $(this)[0].id;
                var splitIndex = GetXIndexOf('_', elementId, 2);
                currentVideoId = elementId.substring(splitIndex + 1);
                currentType = parseInt(elementId.substring(splitIndex - 1, splitIndex));
                var url = GetPattern().replace("{videoId}", currentVideoId);
                var title = $(this)[0].innerText;
                $("#playerMessage").text(title);
                $("#funArea").attr("class", "funBar-" + currentType);
                $("#playArea").show();
                $("#player").attr("src", url);
                $(".btnShow").removeClass("current");
                $(this).addClass("current");
                SetInstance();
                var expires = new Date();
                expires.setTime(expires.getTime() + 172800000);
                var modeElement = $(".mode.selected");
                var modeId = "";
                if (modeElement.length > 0) {
                    modeId = modeElement[0].id
                }
                var settings = {
                    Id: currentVideoId,
                    Type: currentType,
                    ModeId: modeId
                };
                DelCookie("MyPlaylistSettings");
                DoCookieSetup("MyPlaylistSettings", JSON.stringify(settings), expires)
            });
            var settings = JSON.parse(GetCookie("MyPlaylistSettings"));
            if (settings === undefined || settings === null) {
                $(".btnShow:first").click()
            } else {
                var targetElement = $(".btnShow[id*='" + settings.Type + "_" + settings.Id + "']");
                if (targetElement.length > 0) {
                    currentVideoId = settings.Id;
                    currentType = settings.Type;
                    var modeId = settings.ModeId;
                    if (modeId != "") {
                        $("#" + modeId).click()
                    }
                    targetElement.click()
                } else {
                    $(".btnShow:first").click()
                }
            }
        } else {
            $(".mode").hide();
            $("#reload").hide();
            $("#clear").hide();
            $("#marqueeArea").hide();
            $("#noData").show()
        }
    })
}

function GetXIndexOf(val, str, x) {
    var targetIndex = str.indexOf(val);
    if (targetIndex > 0 && x <= (str.split(val).length - 1)) {
        for (var i = 0; i < x - 1; i++) {
            targetIndex = str.indexOf(val, targetIndex + 1)
        }
    }
    return targetIndex
}

function PlayNext(startOver) {
    var totalCount = $("ul").children().length;
    var currentIndex = $(".current").parent().index("li");
    var nextIndex = currentIndex + 1;
    if (nextIndex < totalCount) {
        var selectNum = nextIndex + 1;
        $("ul li:nth-child(" + selectNum + ") div").click()
    } else {
        if (startOver) {
            $("ul li:nth-child(1) div").click()
        }
    }
}

function Shuffle() {
    var totalCount = $("ul").children().length;
    var randomSelectNum = Math.floor((Math.random() * totalCount) + 1);
    var currentSelectNum = $(".current").parent().index("li") + 1;
    if (randomSelectNum != currentSelectNum) {
        $("ul li:nth-child(" + randomSelectNum + ") div").click()
    } else {
        Shuffle()
    }
}

function Replay() {
    $(".current").click()
}

function Action() {
    switch (currentMode) {
        case 0:
            PlayNext(false);
            break;
        case 1:
            Replay();
            break;
        case 2:
            PlayNext(true);
            break;
        case 3:
            Shuffle();
            break;
        default:
            PlayNext(false);
            break
    }
}

// Base On Type
function GetPattern() {
    switch (currentType) {
        case 0:
            return youtubePattern;
        case 1:
            return soundcloudPattern;
        case 2:
            return spotifyPattern;
        default:
            return youtubePattern
    }
}

function SetInstance() {
    switch (currentType) {
        case 0:
            SetYoutubeInstance();
            break;
        case 1:
            if (isSoundCloudReady) {
                SetSoundCloudInstance()
            } else {
                InitSoundCloud();
                isSoundCloudReady = true
            }
            break;
        case 2:
            SetSpotifyInstance();
            break;
        default:
            SetYoutubeInstance();
            break
    }
}

// Cookie
function DoCookieSetup(name, value, expireDate) {
    var expires = null;
    if (arguments.length < 3) {
        expires = new Date();
		 // 2 days = 2*24*60*60*1000
        expires.setTime(expires.getTime() + 172800000)
    } else {
        expires = expireDate
    }
    document.cookie = name + "=" + escape(value) + ";expires=" + expires.toGMTString()
}

function DelCookie(name) {
    var exp = new Date();
    exp.setTime(exp.getTime() - 1);
    var cval = GetCookie(name);
    document.cookie = escape(name) + "=" + cval + "; expires=" + exp.toGMTString()
}

function GetCookie(name) {
    var arg = escape(name) + "=";
    var nameLen = arg.length;
    var cookieLen = document.cookie.length;
    var i = 0;
    while (i < cookieLen) {
        var j = i + nameLen;
        if (document.cookie.substring(i, j) == arg) return GetCookieValueByIndex(j);
        i = document.cookie.indexOf(" ", i) + 1;
        if (i == 0) break
    }
    return null
}

function GetCookieValueByIndex(startIndex) {
    var endIndex = document.cookie.indexOf(";", startIndex);
    if (endIndex == -1) endIndex = document.cookie.length;
    return unescape(document.cookie.substring(startIndex, endIndex))
}