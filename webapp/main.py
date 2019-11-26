import urllib.request
from base64 import b64encode
from urllib.parse import urlencode

from flask import Flask, request, render_template, redirect
from flask_socketio import SocketIO, emit

from model.spotify.playlist import Playlist
from model.spotify.track import Track
from model.vector.glove_sorter import GloveSorter
from util.request import *

# Download Files
if not os.path.exists('data'):
    os.mkdir('data')
    urllib.request.urlretrieve(TRACK_MAP_URL, os.path.join('data', 'track_map.dms'))
    urllib.request.urlretrieve(MODEL_URL, os.path.join('data', 'glove_model.npz'))

# Start app
app = Flask(__name__)
app.config['SECRET_KEY'] = generate_random_string(32)
socketio = SocketIO(app, ping_timeout=120)

model = GloveSorter(os.path.join('data', 'glove_model.npz'), os.path.join('data', 'track_map.dms'), socketio)
model.initialize()


###########################################
################ APP ROUTES ###############
###########################################

@app.route('/')
def index():
    me = session.get(SPOTIFY_USER, None)
    if me is not None:
        return render_template('index.html', loggedIn=True, user=me)
    return render_template('index.html')


@app.route('/login')
def login():
    print('Login clicked!')
    state = generate_random_string(16)
    query_string = urlencode({
        'response_type': 'code',
        'client_id': CLIENT_ID,
        'scope': SCOPE,
        'redirect_uri': REDIRECT_URI,
        'state': state
    })
    redirect_url = 'https://accounts.spotify.com/authorize?' + query_string
    response = make_response(redirect(redirect_url))
    response.set_cookie(STATE_KEY, state)
    return response


@app.route('/callback')
def spotify_callback():
    code = request.args.get('code')
    state = request.args.get('state')
    stored_state = request.cookies.get(STATE_KEY)
    success_response = make_response(redirect('/'))
    success_response.set_cookie(STATE_KEY, '', expires=0)

    if state is None or state != stored_state:
        return send_error_response('State mismatch')

    headers = {
        'Authorization': 'Basic ' + b64encode((CLIENT_ID + ':' + CLIENT_SECRET).encode('utf-8')).decode('utf-8')}
    payload = {'code': code, 'redirect_uri': REDIRECT_URI, 'grant_type': 'authorization_code'}
    content = post('https://accounts.spotify.com/api/token', headers, payload)
    if content is None:
        return send_error_response('Could not retrieve access token')

    access_token = content['access_token']
    session[API_SESSION_TOKEN] = access_token
    _ = content['refresh_token']

    me_json = get('https://api.spotify.com/v1/me', socketio)
    if me_json is None:
        return send_error_response('Could not retrieve user data')
    session[SPOTIFY_USER] = me_json
    session[PLAYLISTS_FULLY_LOADED] = False
    session[PLAYLIST_OFFSET] = 0
    return redirect("/")


###########################################
################ SOCKET.IO ################
###########################################

@socketio.on('connect')
def connect():
    emit('my response', {'data': 'Connected'})


@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')


@socketio.on('getPlaylists')
@require_api_token
def retrieve_playlists(_):
    if session[PLAYLISTS_FULLY_LOADED]:
        return
    payload = {'offset': session[PLAYLIST_OFFSET]}
    playlist_json = get('https://api.spotify.com/v1/users/' + session[SPOTIFY_USER]['id'] + '/playlists', socketio, payload)
    if playlist_json is None:
        return send_error_response('Could not retrieve playlists')

    playlists = Playlist.parse_json(playlist_json)
    if playlists is None:
        return
    session[PLAYLIST_OFFSET] += 20
    session[PLAYLISTS_FULLY_LOADED] = len(playlists) < 20
    emit('playlists', {'playlists': [p.to_dict() for p in playlists], 'loadedAll': session[PLAYLISTS_FULLY_LOADED]})


@socketio.on('resetPlaylists')
@require_api_token
def reset_playlists(_):
    session[PLAYLIST_OFFSET] = 0
    session[PLAYLISTS_FULLY_LOADED] = False
    retrieve_playlists()


@socketio.on('playlistSelected')
@require_api_token
def retrieve_playlist(data):
    playlist = Playlist(data['id'], data['name'], data['href'], data['uri'], None)
    session[PLAYLIST_OFFSET] = 0
    tracks = load_tracks(playlist.get_id())
    if tracks is None:
        return
    playlist.set_tracks(tracks)
    session[SELECTED_PLAYLIST] = playlist
    emit('playlistTracks', [t.to_dict() for t in tracks])


@socketio.on('trackSelected')
@require_api_token
def sort_playlist(data):
    track = session[SELECTED_PLAYLIST].find_track_by_id(data['track_id'])
    if track is None:
        socket_error('Could not find the selected track')
        return
    if not model.initialized:
        socket_error('Model is not initialized yet')
        return
    try:
        sorted_playlist = model.sort_playlist(session[SELECTED_PLAYLIST], track)
    except:
        socket_error('There was an error with the connection to Spotify. Please try a smaller playlist.')
        return

    if sorted_playlist is None:
        socket_error('Playlist could not be sorted')
        return

    created_playlist = create_playlist(sorted_playlist)
    if created_playlist is None:
        return
    add_tracks_to_playlist(created_playlist, sorted_playlist.get_tracks())
    emit('sortedPlaylist', created_playlist.to_dict())


###########################################
################# HELPERS #################
###########################################


@require_api_token
def load_tracks(playlist_id):
    tracks = []
    while True:
        track_json = get('https://api.spotify.com/v1/playlists/' + playlist_id + '/tracks',
                         socketio, payload={'offset': session[PLAYLIST_OFFSET]})
        if track_json is None:
            socket_error('Could not retrieve tracks')
            return

        tracks.extend(Track.parse_json(track_json))
        session[PLAYLIST_OFFSET] += len(track_json['items'])
        if session[PLAYLIST_OFFSET] > MAX_PLAYLIST_LENGTH:
            socket_error('Sorry! Right now we only support playlists with up to 300 tracks.',
                         'Please <a href="/">start over</a> and choose a different playlist.')
            return None
        if len(track_json['items']) < 100:
            break
    return tracks


@require_api_token
def create_playlist(sorted_playlist):
    headers = {'Authorization': 'Bearer ' + session[API_SESSION_TOKEN]}
    payload = {'name': sorted_playlist.get_name(), 'public': False, 'description': 'Created by Sortify!'}
    response = post('https://api.spotify.com/v1/users/' + session[SPOTIFY_USER]['id'] + '/playlists', headers, None,
                    payload)
    if response is None:
        socket_error('Playlist could not be created')
        return None
    return Playlist.parse_json_single_playlist(response)


@require_api_token
def add_tracks_to_playlist(playlist, tracks):
    lower_index = 0
    playlist.set_tracks(tracks)
    uris = playlist.get_track_uris()
    length = len(uris)
    while (lower_index < length):
        to_add = uris[lower_index:(min(length, lower_index + 100))]
        headers = {'Authorization': 'Bearer ' + session[API_SESSION_TOKEN]}
        payload = {'position': lower_index, 'uris': to_add}
        post('https://api.spotify.com/v1/playlists/' + playlist.get_id() + '/tracks', headers, None, payload)
        lower_index += 100


def socket_error(main='', subtitle=None):
    if subtitle is None:
        subtitle = 'Sorry, this should not have happened!<br>Please try <a href="/">starting over</a>.'

    emit('error', {'main': main, 'subtitle': subtitle})


def send_error_response(message=''):
    return make_response(render_template('index.html', error=True, message=message))


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=8080)
