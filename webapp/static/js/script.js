$(document).ready(function () {

    const socket = io.connect();

    // Emitting events

    $('div.playlist').on('click', function () {
        if ($(this).hasClass('selected')) {
            const playlistId = $(this).attr("data-playlist-id");
            const playlistName = $(this).attr("data-playlist-name");
            const playlistHref = $(this).attr("data-playlist-href");
            const playlistUri = $(this).attr("data-playlist-uri");
            emitSocket(socket, 'playlistSelected', {
                id: playlistId,
                name: playlistName,
                href: playlistHref,
                uri: playlistUri
            }, 'Stay tuned! Loading songs of <strong>' + playlistName + "</strong> ...");
            $('.playlist-wrapper').hide('fast');
            $('.track-heading').html(playlistName);
        }
    });


    // Receiving events

    socket.on('playlistTracks', function (tracks) {
        hideLoader();
        appendTracks(tracks, socket);
        selectTrack();
    });

    socket.on('sortedPlaylist', function (playlist) {
        // noinspection JSUnresolvedVariable
        hideLoader();
        appendTracks(playlist.tracks, socket);
        selectTrack();
    });

    socket.on('error', function (message) {
        hideLoader();
        if (message === 'Playlist too long') {
            $('.error-message').html('Sorry, right now we only support playlists up to 500 tracks.');
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
        $('.track-wrapper').hide('fast');
        $trackList.empty();
        $trackList.scrollTop(0);
        $('.playlist-wrapper').show('fast');
        stopAudioPlayback();
        selectPlaylist();
    });

    $trackList.scroll(function () {
        stopAudioPlayback();
    });

    $trackList.scrollEnd(selectTrack, 250);

    $playlistList.scrollEnd(selectPlaylist, 250);

    selectPlaylist();

});

// TODO: MODULARIZE

function registerTrackEvents(socket) {
    let trackItem = $('div.track');
    registerTrackClick(trackItem, socket);
}

function registerTrackClick(trackItem, socket) {
    trackItem.off("click");
    trackItem.on('click', function () {
        if ($(this).hasClass('selected')) {
            const trackId = $(this).attr("data-track-id");
            $('.track-list').empty();
            stopAudioPlayback();
            emitSocket(socket, 'trackSelected', {track_id: trackId}, "Awesome Choice! We are sorting your playlist starting with <strong>" + $(this).attr("data-track-name") + "</strong> ...");
        }
    });
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
    $('.track-wrapper').show('fast');
}

function selectElement(element) {
    element.removeClass('selected');
    const index = Math.round(element.parent().scrollTop() / element.outerHeight());
    let selectedElement = $(element[index]);
    selectedElement.addClass('selected');
    $('body').css('background-color', selectedElement.attr('data-background-color'));
    return selectedElement;
}

function selectPlaylist() {
    selectElement($(".playlist"))
}

function selectTrack() {
    let selectedTrack = selectElement($('.track'), $('.track-list'));
    let previewUrl = selectedTrack.attr('data-track-preview-url');
    if (previewUrl !== 'null') {
        const audio = $("<audio id='" + $(this).attr('data-track-id') + "'></audio>")
            .attr({
                'src': previewUrl + '.mp3',
                'autoplay': 'autoplay',
                'loop': 'true'
            }).appendTo("body");
        audio[0].volume = 0;
        audio.animate({volume: 1}, 1000);
    }
}

function stopAudioPlayback() {
    $('audio').remove();
}

function emitSocket(socket, socketMessage, data, loaderMessage) {
    showLoader(loaderMessage);
    socket.emit(socketMessage, data)
}

function showLoader(message) {
    $('.loading-message').html(message);
    $('.loader').fadeTo('fast', 1);
}

function hideLoader() {
    $('.loader').fadeOut('fast');
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



