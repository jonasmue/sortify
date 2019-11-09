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

    function registerTrackClick() {
        let trackItem = $('li.track');
        trackItem.off("click");
        trackItem.click(function () {
            const trackId = $(this).attr("data-track-id");
            const name = $(this).attr("data-track-name");
            const artist = $(this).attr("data-track-artist");
            socket.emit('trackSelected', {
                track_id: trackId,
                track_name: name,
                track_artist: artist
            });
        });
    }


    // Receiving events

    socket.on('playlistTracks', function (tracks) {
        const trackList = $('.track-list');
        for (let i in tracks) {
            const track = tracks[i];
            trackList.append('<li class="track" ' +
                ' data-track-id="' + track.id + '"' +
                ' data-track-name="' + track.name + '"' +
                ' data-track-artist="' + track.artists[0].name + '"' +
                '>' +
                '<span class="track-name">' +
                track.name +
                '</span> &mdash; ' +
                '<span class="track-artist">' +
                track.artists[0].name +
                '</span></li>');
        }
        registerTrackClick();
        $('.track-wrapper').show('fast');
    });

    socket.on('error', function (message) {
        let socketError = $('.socket-error');
        socketError.html(message);
        socketError.show();
    });
});



