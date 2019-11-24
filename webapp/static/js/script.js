const State = {
    IDLE: 1,
    PLAYLIST: 2,
    TRACKS: 3,
};

const Sortify = (function () {
    'use strict';

    let state = State.IDLE;

    return {
        getState: function () {
            return state;
        },

        setState: function (newState) {
            state = newState;
        }
    };
}());

Sortify.keyEventHandler = (function () {
    'use strict';

    function registerEvents(socket) {
        $(document).on('keydown', function (event) {
            handleKeypress(event, socket);
        });
    }

    function handleKeypress(event, socket) {
        event.preventDefault();
        if (Sortify.scrollHandler.isScrolling()) return;
        let $selected = Sortify.elementHandler.getSelectedElement();
        switch (event.which) {
            case 37:
                // left
                if (Sortify.getState() !== State.TRACKS) break;
                Sortify.listHandler.backToPlaylists();
                break;
            case 38:
                // up
                if (Sortify.getState() === State.IDLE) break;
                if (Sortify.elementHandler.isFirst($selected)) break;
                Sortify.scrollHandler.scrollTo($selected.prev());
                break;
            case 39:
            case 13:
                // right
                // enter
                if (Sortify.getState() === State.PLAYLIST) {
                    Sortify.listHandler.clickSelectedPlaylist(socket);
                } else if (Sortify.getState() === State.TRACKS) {
                    Sortify.listHandler.clickSelectedTrack(socket);
                }
                break;
            case 40:
                // down
                if (Sortify.getState() === State.IDLE) break;
                if (Sortify.elementHandler.isLast($selected)) break;
                Sortify.scrollHandler.scrollTo($selected.next());
                break;
        }
    }

    return {
        registerEvents: registerEvents
    };
}());

Sortify.listHandler = (function () {
    'use strict';

    let loadedAllPlaylists = false;

    const playlistWrapperSelector = '.playlist-wrapper';
    const playlistListSelector = '.playlist-list';
    const playlistSelector = '.playlist';

    const trackWrapperSelector = '.track-wrapper';
    const trackHeadingSelector = '.track-heading';
    const trackListSelector = '.track-list';
    const trackSelector = '.track';


    function backToPlaylists() {
        Sortify.audioHandler.stopAudioPlayback();
        Sortify.animationHandler.stopAnimation('moveTitle');
        $(trackListSelector).css('scroll-behavior', 'auto');
        $(trackListSelector)[0].scrollTop = 0;
        $(trackListSelector).css('scroll-behavior', 'smooth');
        $(trackWrapperSelector).hide();
        $(trackListSelector).empty();
        $(playlistWrapperSelector).show();
        selectPlaylist();
        Sortify.setState(State.PLAYLIST);
    }

    function clickSelectedTrack(socket) {
        Sortify.setState(State.IDLE);
        const selected = Sortify.elementHandler.getSelectedElement();
        const trackId = selected.attr("data-track-id");
        $(trackListSelector).empty();
        Sortify.audioHandler.stopAudioPlayback();
        Sortify.socketHandler.emitToSocket(socket,
            'trackSelected',
            {track_id: trackId},
            "Awesome Choice! We are sorting your playlist starting with <br><strong>" + selected.attr("data-track-name") + "</strong> ...");
    }

    function registerTrackClick(socket) {
        $(trackSelector).off('click');
        $(trackSelector).on('click', function () {
            if ($(this).hasClass('selected')) {
                clickSelectedTrack(socket);
            } else {
                Sortify.scrollHandler.scrollTo($(this));
            }
        });
    }

    function clickSelectedPlaylist(socket) {
        const selected = Sortify.elementHandler.getSelectedElement();
        const playlistId = selected.attr("data-playlist-id");
        const playlistName = selected.attr("data-playlist-name");
        const playlistHref = selected.attr("data-playlist-href");
        const playlistUri = selected.attr("data-playlist-uri");
        Sortify.socketHandler.emitToSocket(socket, 'playlistSelected', {
            id: playlistId,
            name: playlistName,
            href: playlistHref,
            uri: playlistUri
        }, 'Stay tuned! Loading songs of <br><strong>' + playlistName + "</strong> ...");
        selected.removeClass('selected');
        $(playlistWrapperSelector).hide('fast');
        $(trackHeadingSelector).html(playlistName);
    }

    function registerPlaylistClick(socket) {
        $(playlistSelector).off("click");
        $(playlistSelector).on('click', function () {
            if ($(this).hasClass('selected')) {
                clickSelectedPlaylist(socket);
            } else {
                Sortify.scrollHandler.scrollTo($(this));
            }
            Sortify.audioHandler.fakePlay();
        });
    }

    function appendPlaylists(playlists, complete, socket) {
        Sortify.setState(State.PLAYLIST);
        loadedAllPlaylists = complete;
        for (let i in playlists) {
            const playlist = playlists[i];
            const playlistElement = Sortify.elementHandler.create('div', {
                'class': 'spotify-list-item playlist',
                'data-playlist-id': playlist.id,
                'data-playlist-name': playlist.name,
                'data-playlist-uri': playlist.uri,
                'data-playlist-href': playlist.href,
                'data-background-color': playlist.color
            });
            const playlistName = Sortify.elementHandler.create('div', {
                'class': 'spotify-list-item-text playlist-name'
            });
            playlistName.appendChild(document.createTextNode(playlist.name));
            playlistElement.appendChild(playlistName);
            $(playlistListSelector)[0].appendChild(playlistElement);
        }
        registerPlaylistClick(socket);
        $(playlistWrapperSelector).show('fast');
        selectPlaylist();
    }

    function appendTracks(tracks, socket) {
        Sortify.setState(State.TRACKS);
        for (let i in tracks) {
            const track = tracks[i];
            const artists = track['artists'].map((a) => a.name).join(' & ');
            const trackElement = Sortify.elementHandler.create('div', {
                'class': 'spotify-list-item track',
                'data-track-id': track['id'],
                'data-track-name': track['name'],
                'data-track-preview-url': track['preview_url'],
                'data-background-color': track['color'],
            });
            const trackInfo = Sortify.elementHandler.create('div', {'class': 'spotify-list-item-text track-info'});
            const trackName = Sortify.elementHandler.create('span', {'class': 'track-name'});
            const trackArtist = Sortify.elementHandler.create('span', {'class': 'track-artist'});

            trackName.appendChild(document.createTextNode(track['name']));
            trackArtist.appendChild(document.createTextNode(artists));
            trackInfo.appendChild(trackName);
            trackInfo.appendChild(document.createTextNode(' \u2014 '));
            trackInfo.appendChild(trackArtist);
            trackElement.appendChild(trackInfo);
            $(trackListSelector)[0].appendChild(trackElement);
        }
        registerTrackClick(socket);
        $(trackWrapperSelector).show('fast', function () {
            Sortify.animationHandler.maybeAnimateOverflowingElement('moveTitle', $(trackHeadingSelector), 30000);
        });
        selectTrack();
    }

    function selectPlaylist() {
        Sortify.scrollHandler.setScrolling(false);
        Sortify.elementHandler.selectElement($(playlistSelector));
    }

    function selectTrack() {
        Sortify.scrollHandler.setScrolling(false);
        Sortify.elementHandler.selectElement($(trackSelector));
        Sortify.audioHandler.play();
    }

    function maybeLoadMorePlaylists(socket) {
        if (loadedAllPlaylists) return;
        Sortify.socketHandler.emitToSocket(socket,
            'getPlaylists',
            null,
            'Hold on! Getting more of your playlists...')
    }

    function registerEvents(socket) {
        $('.back-button').on('click', function () {
            backToPlaylists();
        });

        $('.playlist-button').on('click', function () {
            $('.me-wrapper').hide();
            Sortify.socketHandler.emitToSocket(socket,
                "getPlaylists",
                null,
                "Nice! We are getting your playlists now!");
        });

        $(playlistListSelector).scroll(function () {
            Sortify.scrollHandler.setScrolling(true);
            Sortify.elementHandler.unselectElement($(playlistListSelector));
            Sortify.animationHandler.stopAnimation('move');
            let playlistCount = $(playlistSelector).length;
            let currentIndex = Math.round($(this).scrollTop() / $(playlistSelector).outerHeight());
            if (currentIndex === playlistCount - 1 && !Sortify.loaderHandler.isLoading()) {
                maybeLoadMorePlaylists(socket);
            }
        });

        $(trackListSelector).scroll(function () {
            Sortify.scrollHandler.setScrolling(true);
            Sortify.elementHandler.unselectElement($(trackListSelector));
            Sortify.animationHandler.stopAnimation('move');
            Sortify.audioHandler.stopAudioPlayback();
            $('.audio-button').hide();
        });

        $(trackListSelector).scrollEnd(selectTrack, 250);

        $(playlistListSelector).scrollEnd(selectPlaylist, 250);
    }

    return {
        backToPlaylists: backToPlaylists,
        clickSelectedPlaylist: clickSelectedPlaylist,
        clickSelectedTrack: clickSelectedTrack,
        selectPlaylist: selectPlaylist,
        appendPlaylists: appendPlaylists,
        appendTracks: appendTracks,
        registerEvents: registerEvents
    }
}());

Sortify.audioHandler = (function () {
    'use strict';

    let audioActivated = true;
    let playRequested = false;

    const audioSelector = '.track-audio';
    const audioButtonSelector = '.audio-button';

    function toggleAudio() {
        audioActivated = !audioActivated;
        Sortify.animationHandler.animateAudioButton(audioActivated);
        if (!audioActivated) stopAudioPlayback();
        else play();
    }

    function stopAudioPlayback() {
        playRequested = false;
        $(audioSelector)[0].pause();
    }

    function play() {
        const previewUrl = Sortify.elementHandler.getSelectedElement().attr('data-track-preview-url');
        if (typeof previewUrl === 'undefined' || previewUrl === 'null') return;
        $(audioButtonSelector).show();
        if (!audioActivated) return;
        // Hack to get around Safari restriction
        playRequested = true;
        $(audioSelector)[0].src = previewUrl + '.mp3';
        $(audioSelector)[0].volume = 0;
        $(audioSelector)[0].play();
        $(audioSelector).animate({volume: 1}, 1000);
    }

    function registerEvents() {
        $(audioButtonSelector).on('click', toggleAudio);
    }

    function fakePlay() {
        // Hack to get around Safari audio issue
        const playPromise = $(audioSelector)[0].play();

        if (playPromise !== undefined) {
            playPromise.then(_ => {
                if (!playRequested) {
                    $(audioSelector)[0].pause();
                }
            }).catch(error => {
                console.log(error);
            });
        }
    }

    return {
        stopAudioPlayback: stopAudioPlayback,
        play: play,
        fakePlay: fakePlay,
        registerEvents: registerEvents
    }
}());

Sortify.successHandler = (function () {

    const wrapperSelector = '.success-wrapper';

    function showSuccess(playlist) {
        $('.track-wrapper').hide();
        $('body').css('background-color', 'var(--main-bg)');
        $('.spotify-link').attr('href', playlist['href']);
        $(wrapperSelector).show();
        Sortify.animationHandler.showConfetti(wrapperSelector);
    }

    function registerEvents() {
        $('.sort-more').on('click', function () {
            $(wrapperSelector).hide('fast');
            $('.playlist-wrapper').show('fast');
            Sortify.listHandler.selectPlaylist();
        });
    }

    return {
        showSuccess: showSuccess,
        registerEvents: registerEvents
    }
}());

Sortify.errorHandler = (function () {

    function showError(message) {
        console.log('Error', message);
        $('.error-message').html(message['main']);
        $('.error-subtitle').html(message['subtitle']);
        $('.socket-error').fadeTo('fast', 1);
    }

    return {
        showError: showError
    }
}());

Sortify.loaderHandler = (function () {
    let loading = false;

    const loaderSelector = '.loader';

    function showLoader(message) {
        loading = true;
        $('.loading-message').html(message);
        $(loaderSelector).fadeTo('fast', 1);
    }

    function hideLoader() {
        $(loaderSelector).fadeOut('fast');
        loading = false;
    }

    return {
        isLoading: function () {
            return loading;
        },
        showLoader: showLoader,
        hideLoader: hideLoader
    }

}());

Sortify.animationHandler = (function () {
    'use strict';

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

    function stopAnimation(cssClass) {
        let $move = $('.' + cssClass);
        $move.stop();
        $move.css('margin-left', 0);
        $move.removeClass(cssClass);
    }

    function showConfetti(parentSelector) {
        for (let i = 0; i < 250; i++) {
            createConfetti(i, parentSelector);
        }
    }

    function createConfetti(i, parentSelector) {
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
        }).appendTo(parentSelector);
        dropConfetti(i);
    }

    function dropConfetti(x) {
        let $confetti = $('.confetti-' + x);
        $confetti.animate({
            top: "100%",
            left: "+=" + Math.random() * 15 + "%"
        }, Math.random() * 3000 + 3000, function () {
            $confetti.remove();
        });
    }

    function animateAudioButton(animate) {
        if (animate) {
            $(".bar").removeClass('no-anim');
        } else {
            $(".bar").addClass('no-anim');
        }
    }

    return {
        stopAnimation: stopAnimation,
        maybeAnimateOverflowingElement: maybeAnimateOverflowingElement,
        animateAudioButton: animateAudioButton,
        showConfetti: showConfetti
    }

}());

Sortify.elementHandler = (function () {
    'use strict';

    function isFirst($element) {
        return $element.prev().length === 0;
    }

    function isLast($element) {
        return $element.next().length === 0;
    }

    function selectElement($element) {
        unselectElement($element);
        const index = Math.round($element.parent().scrollTop() / $element.outerHeight());
        let $selectedElement = $($element[index]);
        $selectedElement.addClass('selected');
        Sortify.animationHandler.maybeAnimateOverflowingElement('move', $selectedElement);
        let color = $selectedElement.attr('data-background-color');
        $('body').css('background-color', color);
        return $selectedElement;
    }

    function unselectElement($element) {
        Sortify.animationHandler.stopAnimation('move');
        getSelectedElement($element).removeClass('selected');

    }

    function getSelectedElement($element='body') {
        return $($element).find('.selected');
    }

    function create(element, attributes) {
        const e = document.createElement(element);
        for (let value in attributes) {
            e.setAttribute(value, attributes[value]);
        }
        return e;
    }

    return {
        isFirst: isFirst,
        isLast: isLast,
        getSelectedElement: getSelectedElement,
        selectElement: selectElement,
        unselectElement: unselectElement,
        create: create
    }
}());

Sortify.scrollHandler = (function () {
    let isScrolling = false;

    function scrollTo($element) {
        if (!$element) return;
        $element.parent().scrollTop($element.parent().scrollTop() + $element.offset().top - $element.height() - parseInt($element.css('padding-top')) * 2 + $element.height() / 2);
    }

    return {
        isScrolling: function () {
            return isScrolling;
        },
        setScrolling: function (scrolling) {
            isScrolling = scrolling
        },
        scrollTo: scrollTo
    }


}());

Sortify.socketHandler = (function () {
    function emitToSocket(socket, socketMessage, data, loaderMessage) {
        Sortify.loaderHandler.showLoader(loaderMessage);
        socket.emit(socketMessage, data)
    }

    function registerSocketEvents(socket) {
        socket.on('playlists', function (playlistData) {
            Sortify.loaderHandler.hideLoader();
            Sortify.listHandler.appendPlaylists(playlistData['playlists'], playlistData['loadedAll'], socket);
        });

        socket.on('playlistTracks', function (tracks) {
            Sortify.loaderHandler.hideLoader();
            Sortify.listHandler.appendTracks(tracks, socket);
        });

        socket.on('sortedPlaylist', function (playlist) {
            Sortify.loaderHandler.hideLoader();
            Sortify.successHandler.showSuccess(playlist);
        });

        socket.on('error', function (message) {
            Sortify.loaderHandler.hideLoader();
            Sortify.errorHandler.showError(message);
        });
    }

    return {
        emitToSocket: emitToSocket,
        registerSocketEvents: registerSocketEvents
    }
}());

/************************************
 *          ONLOAD EVENTS
 ************************************/

$(document).ready(function () {
    const socket = io.connect();
    Sortify.socketHandler.registerSocketEvents(socket);
    Sortify.listHandler.registerEvents(socket);
    Sortify.audioHandler.registerEvents();
    Sortify.keyEventHandler.registerEvents(socket);
    Sortify.successHandler.registerEvents();
});

/************************************
 *        JQUERY EXTENSIONS
 ************************************/

$.fn.scrollEnd = function (callback, timeout) {
    $(this).scroll(function () {
        const $this = $(this);
        if ($this.data('scrollTimeout')) {
            clearTimeout($this.data('scrollTimeout'));
        }
        $this.data('scrollTimeout', setTimeout(callback, timeout));
    });
};