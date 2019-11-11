$(document).ready(function () {

    var socket = io.connect();

    // Emitting events

    $('li.playlist').click(function () {
        const playlistId = $(this).attr("data-playlist-id");
        const playlistName = $(this).attr("data-playlist-name");
        const playlistHref = $(this).attr("data-playlist-href");
        socket.emit('playlistSelected', {
            id: playlistId,
            name: playlistName,
            href: playlistHref
        });
        $('.playlist-wrapper').hide('fast');
        $('.track-heading').html(playlistName);
    });


    // Receiving events

    socket.on('playlistTracks', function (tracks) {
        appendTracks(tracks, socket);
    });

    socket.on('sortedPlaylist', function (playlist) {
        appendTracks(playlist.tracks, socket)
    });

    socket.on('error', function (message) {
        let socketError = $('.socket-error');
        socketError.html(message);
        socketError.show();
    });

    // jQuery functions

    $('.back-button').click(function () {
        $('.track-wrapper').hide();
        $('.track-list').empty();
        $('.playlist-wrapper').show();
    });

});

// TODO: MODULARIZE

function registerTrackEvents(socket) {
    let trackItem = $('li.track');
    registerTrackClick(trackItem, socket);
    registerTrackMouseOver(trackItem);
    registerTrackMouseOut(trackItem);
}

function registerTrackClick(trackItem, socket) {
    trackItem.off("click");
    trackItem.click(function () {
        const trackId = $(this).attr("data-track-id");
        $('.track-list').empty();
        $('audio').remove();
        socket.emit('trackSelected', {
            track_id: trackId,
        });
    });
}

function registerTrackMouseOver(trackItem) {
    trackItem.off('mouseover');
    trackItem.mouseover(function () {
        previewUrl = $(this).attr('data-track-preview-url');
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
    });
}

function registerTrackMouseOut(trackItem) {
    trackItem.off('mouseout');
    trackItem.mouseout(function () {
        $('#' + $(this).attr('data-track-id')).remove();
    });

}

function appendTracks(tracks, socket) {
    const trackList = $('.track-list');
    for (let i in tracks) {
        const track = tracks[i];
        trackList.append('<li class="track" ' +
            ' data-track-id="' + track.id + '"' +
            ' data-track-name="' + track.name + '"' +
            ' data-track-preview-url="' + track.preview_url + '"' +
            ' data-track-artist="' + track.artists.map(function (a) {
                return a.name;
            }).join(",") + '"' +
            '>' +
            '<span class="track-name">' +
            track.name +
            '</span> &mdash; ' +
            '<span class="track-artist">' +
            track.artists.map(function (a) {
                return a.name;
            }).join(" & ") +
            '</span></li>');
    }
    registerTrackEvents(socket);
    $('.track-wrapper').show('fast');
}



