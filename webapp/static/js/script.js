$(document).ready(function () {

    var socket = io.connect();

    // Emitting events

    $(window).scroll(function () {
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 100) {
            socket.emit('loadMoreTracks')
        }
    });

    $('li.playlist').click(function () {
        const playlistId = $(this).attr("data-playlist-id");
        socket.emit('playlistSelected', {playlist_id: playlistId});
        $('.playlist-wrapper').hide('fast');
        $('.track-heading').html($(this).html());
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
            const track = tracks[i].track;
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



