$(document).ready(function () {

    state = State.IDLE;
    const socket = io.connect();

    // Receiving events

    socket.on('playlists', function (playlistData) {
        hideLoader();
        state = State.PLAYLIST;
        loadedAllPlaylists = playlistData['loadedAll'];
        appendPlaylists(playlistData['playlists'], socket);
        selectPlaylist();
    });

    socket.on('playlistTracks', function (tracks) {
        state = State.TRACKS;
        hideLoader();
        appendTracks(tracks, socket);
        selectTrack();
    });

    socket.on('sortedPlaylist', function (playlist) {
        hideLoader();
        $('.track-wrapper').hide();
        $('body').css('background-color', 'var(--main-bg)');
        $('.spotify-link').attr('href', playlist['href']);
        $('.success-wrapper').show();
        showConfetti();
        // noinspection JSUnresolvedVariable
        //appendTracks(playlist.tracks, socket);
        //selectTrack();
    });

    socket.on('error', function (message) {
        console.log('Error', message);
        hideLoader();
        if (message === 'Playlist too long') {
            $('.error-message').html('Sorry, right now we only support playlists up to 300 tracks.');
            $('.error-subtitle').html('Please <a href="/">start over</a> and choose a different playlist.');
        } else {
            $('.error-message').html(message);
            $('.error-subtitle').html('Sorry, this should not have happened!<br>Please try <a href="/">starting over</a>.');
        }
        $('.socket-error').fadeTo('fast', 1);
    });

    // jQuery functions

    let $trackList = $('.track-list');
    let $playlistList = $('.playlist-list');

    $('.back-button').on('click', function () {
        backToPlaylists();
    });

    $('.playlist-button').on('click', function () {
        $('.me-wrapper').hide();
        emitSocket(socket, "getPlaylists", null, "Nice! We are getting your playlists now!");
    });

    $('.audio-button').on('click', toggleAudio);

    $trackList.scroll(function () {
        isScrolling = true;
        $('.track').removeClass('selected');
        stopAnimation('move');
        stopAudioPlayback();
        $('.audio-button').hide();
    });

    $trackList.scrollEnd(selectTrack, 250);

    $playlistList.scrollEnd(selectPlaylist, 250);

    $(document).on('keydown', function (event) {
        handleKeypress(event, socket);
    });

    $playlistList.scroll(function () {
        isScrolling = true;
        let $playlist = $('.playlist');
        $playlist.removeClass('selected');
        stopAnimation('move');
        let playlistCount = $playlist.length;
        let currentIndex = Math.round($(this).scrollTop() / $playlist.outerHeight());
        if (currentIndex === playlistCount - 1 && !loading) {
            maybeLoadMorePlaylists(socket);
        }
    });

    $('.sort-more').on('click', function () {
        $('.success-wrapper').hide('fast');
        $('.playlist-wrapper').show('fast');
        selectPlaylist();
    });

});

let State = {
    IDLE: 1,
    PLAYLIST: 2,
    TRACKS: 3,
};

let state = State.IDLE;
let audioActivated = true;
let loadedAllPlaylists = false;
let loading = false;
let isScrolling = false;
let playRequested = false;

// TODO: MODULARIZE

function handleKeypress(event, socket) {
    event.preventDefault();
    if (isScrolling) return;
    let $selected = $('.selected');
    switch (event.which) {
        case 37:
            // left
            if (state !== State.TRACKS) break;
            backToPlaylists();
            break;
        case 38:
            // up
            if (state === State.IDLE) break;
            if (isFirst($selected)) break;
            scrollTo($selected.prev());
            break;
        case 39:
        case 13:
            // right
            // enter
            if (state === State.PLAYLIST) {
                clickSelectedPlaylist(socket);
            } else if (state === State.TRACKS) {
                clickSelectedTrack(socket);
            }
            break;
        case 40:
            // down
            if (state === State.IDLE) break;
            if (isLast($selected)) break;
            scrollTo($selected.next());
            break;
    }

}

function isFirst($element) {
    return $element.prev().length === 0;
}

function isLast($element) {
    return $element.next().length === 0;
}

function backToPlaylists() {
    stopAudioPlayback();
    stopAnimation('moveTitle');
    $('.track-wrapper').hide('fast');
    const $trackList = $('.track-list');
    $trackList.empty();
    $trackList.scrollTop(0);
    $('.playlist-wrapper').show('fast');
    selectPlaylist();
    state = State.PLAYLIST;
}

function registerTrackEvents(socket) {
    let trackItem = $('div.track');
    registerTrackClick(trackItem, socket);
}

function registerPlaylistEvents(socket) {
    let playlistItem = $('div.playlist');
    registerPlaylistClick(playlistItem, socket);
}

function clickSelectedTrack(socket) {
    state = State.IDLE;
    const $selected = $('.selected');
    const trackId = $selected.attr("data-track-id");
    $('.track-list').empty();
    stopAudioPlayback();
    emitSocket(socket, 'trackSelected', {track_id: trackId}, "Awesome Choice! We are sorting your playlist starting with <strong>" + $selected.attr("data-track-name") + "</strong> ...");
}

function registerTrackClick(trackItem, socket) {
    trackItem.off("click");
    trackItem.on('click', function () {
        if ($(this).hasClass('selected')) {
            clickSelectedTrack(socket);
        } else {
            scrollTo($(this));
        }
    });
}

function clickSelectedPlaylist(socket) {
    const $selected = $('.selected');
    const playlistId = $selected.attr("data-playlist-id");
    const playlistName = $selected.attr("data-playlist-name");
    const playlistHref = $selected.attr("data-playlist-href");
    const playlistUri = $selected.attr("data-playlist-uri");
    emitSocket(socket, 'playlistSelected', {
        id: playlistId,
        name: playlistName,
        href: playlistHref,
        uri: playlistUri
    }, 'Stay tuned! Loading songs of <strong>' + playlistName + "</strong> ...");
    $selected.removeClass('selected');
    $('.playlist-wrapper').hide('fast');
    $('.track-heading').html(playlistName);
}

function registerPlaylistClick(playlistItem, socket) {
    playlistItem.off("click");
    playlistItem.on('click', function () {
        if ($(this).hasClass('selected')) {
            clickSelectedPlaylist(socket);
        } else {
            scrollTo($(this));
        }
        // Hack to get around Safari audio issue
        let $audio = $('.track-audio');
        const playPromise = $audio[0].play();

        if (playPromise !== undefined) {
            playPromise.then(_ => {
                if (!playRequested) {
                    $audio[0].pause();
                }
            }).catch(error => {
                console.log(error);
            });
        }
    });
}

function appendPlaylists(playlists, socket) {
    const playlistList = $('.playlist-list');
    for (let i in playlists) {
        const playlist = playlists[i];
        playlistList.append(
            '<div class="playlist"' +
            ' data-playlist-id="' + playlist.id + '"' +
            ' data-playlist-name="' + playlist.name + '"' +
            ' data-playlist-uri="' + playlist.uri + '"' +
            ' data-playlist-href="' + playlist.href + '"' +
            ' data-background-color="' + playlist.color + '">' +
            '<div class="playlist-name">' + playlist.name + '</div>' +
            '</div>'
        );
    }
    registerPlaylistEvents(socket);
    $('.playlist-wrapper').show('fast');
}

function appendTracks(tracks, socket) {
    const trackList = $('.track-list');
    for (let i in tracks) {
        const track = tracks[i];
        // noinspection JSUnresolvedVariable
        trackList.append('<div class="track" ' +
            ' data-track-id="' + track.id + '"' +
            ' data-track-name="' + track.name + '"' +
            ' data-track-preview-url="' + track.preview_url + '"' +
            ' data-background-color="' + track.color + '"' +
            ' data-track-artist="' + track.artists.map(function (a) {
                return a.name;
            }).join(",") + '"' +
            '>' +
            '<div class="track-info">' +
            '<span class="track-name">' +
            track.name +
            '</span> &mdash; ' +
            '<span class="track-artist">' +
            track.artists.map(function (a) {
                return a.name;
            }).join(" & ") +
            '</span></div></div>');
    }
    registerTrackEvents(socket);
    $('.track-wrapper').show('fast', function () {
        maybeAnimateOverflowingElement('moveTitle', $('.track-heading'), 30000);
    });
}

function maybeAnimateOverflowingElement(cssClass, $selectedElement, maxDuration = 15000) {
    if (!$selectedElement.length) return;
    let diff = $selectedElement[0].scrollWidth - $selectedElement[0].offsetWidth;
    let duration = Math.min(Math.max(diff, 100) * 50, maxDuration);
    if (!$selectedElement.hasClass(cssClass) && diff > 0) {
        $selectedElement.addClass(cssClass);
        $selectedElement.animate({
            'margin-left': '-=' + (diff + 20) + 'px'
        }, duration, function () {
            $selectedElement.animate({
                'margin-left': '0px'
            }, duration);
        });
    }
}

function selectElement(element) {
    element.removeClass('selected');
    const index = Math.round(element.parent().scrollTop() / element.outerHeight());
    let $selectedElement = $(element[index]);
    $selectedElement.addClass('selected');
    maybeAnimateOverflowingElement('move', $selectedElement);
    let color = $selectedElement.attr('data-background-color');
    $('body').css('background-color', color);
    return $selectedElement;
}

function selectPlaylist() {
    isScrolling = false;
    selectElement($(".playlist"))
}

function selectTrack() {
    isScrolling = false;
    let selectedTrack = selectElement($('.track'), $('.track-list'));
    let previewUrl = selectedTrack.attr('data-track-preview-url');
    if (previewUrl !== 'null' && typeof previewUrl !== 'undefined') {
        if (audioActivated) {
            const audio = $(".track-audio");
            // Hack to get around Safari restriction
            playRequested = true;
            audio[0].src = previewUrl + '.mp3';
            audio[0].volume = 0;
            audio[0].play();
            audio.animate({volume: 1}, 1000);
        }
        $('.audio-button').show();
    }
}

function toggleAudio() {
    audioActivated = !audioActivated;
    if (audioActivated) {
        $(".bar").removeClass('no-anim');
    } else {
        $(".bar").addClass('no-anim');
        stopAudioPlayback();
    }
    selectTrack();
}

function stopAnimation(cssClass) {
    let $move = $('.' + cssClass);
    $move.stop();
    $move.css('margin-left', 0);
    $move.removeClass(cssClass);
}

function stopAudioPlayback() {
    playRequested = false;
    $(".track-audio")[0].pause();
}

function emitSocket(socket, socketMessage, data, loaderMessage) {
    showLoader(loaderMessage);
    socket.emit(socketMessage, data)
}

function showLoader(message) {
    loading = true;
    $('.loading-message').html(message);
    $('.loader').fadeTo('fast', 1);
}

function hideLoader() {
    $('.loader').fadeOut('fast');
    loading = false;
}

function maybeLoadMorePlaylists(socket) {
    if (loadedAllPlaylists) return;
    emitSocket(socket, 'getPlaylists', null, 'Hold on! Getting more of your playlists...')
}

function scrollTo($element) {
    if (!$element) return;
    $element.parent().scrollTop($element.parent().scrollTop() + $element.offset().top - $element.height() - parseInt($element.css('padding-top')) * 2 + $element.height() / 2);
}

function showConfetti() {
    for (let i = 0; i < 250; i++) {
        createConfetti(i);
    }
}

function createConfetti(i) {
    let width = Math.random() * 8;
    let height = width * 0.4;
    let colourIdx = Math.ceil(Math.random() * 3);
    let colour = "red";
    switch (colourIdx) {
        case 1:
            colour = "yellow";
            break;
        case 2:
            colour = "white";
            break;
        default:
            colour = "red";
    }
    $('<div class="confetti-' + i + ' ' + colour + '"></div>').css({
        "width": width + "px",
        "height": height + "px",
        "top": -Math.random() * 20 + "%",
        "left": Math.random() * 100 + "%",
        "opacity": Math.random() + 0.5,
        "transform": "rotate(" + Math.random() * 360 + "deg)"
    }).appendTo('.success-wrapper');
    drop(i);
}

function drop(x) {
    let $confetti = $('.confetti-' + x);
    $confetti.animate({
        top: "100%",
        left: "+=" + Math.random() * 15 + "%"
    }, Math.random() * 3000 + 3000, function () {
        $confetti.remove();
    });
}

// extension:
$.fn.scrollEnd = function (callback, timeout) {
    $(this).scroll(function () {
        const $this = $(this);
        if ($this.data('scrollTimeout')) {
            clearTimeout($this.data('scrollTimeout'));
        }
        $this.data('scrollTimeout', setTimeout(callback, timeout));
    });
};



