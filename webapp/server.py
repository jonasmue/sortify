from base64 import b64encode
from urllib.parse import urlencode

from flask import Flask, request, render_template, redirect
from flask_socketio import SocketIO, emit

from model.vector.glove_sorter import GloveSorter
from model.spotify.playlist import Playlist
from model.spotify.track import Track
from util.request import *

app = Flask(__name__)
app.config['SECRET_KEY'] = generate_random_string(32)
socketio = SocketIO(app)

model = GloveSorter(MODEL_URL, TRACK_MAP_URL)
model.initialize()


###########################################
################ APP ROUTES ###############
###########################################

@app.route('/')
def index():
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
    return get_playlists()


###########################################
################ SOCKET.IO ################
###########################################

@socketio.on('connect')
def connect():
    emit('my response', {'data': 'Connected'})


@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')


@socketio.on('playlistSelected')
@require_api_token
def retrieve_playlist(data):
    playlist = Playlist(data['id'], data['name'], data['href'], None)
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
    sorted_playlist = model.sort_playlist(session[SELECTED_PLAYLIST], track)
    emit('sortedPlaylist', sorted_playlist.to_dict())


###########################################
################# HELPERS #################
###########################################

@require_api_token
def get_playlists():
    me_json = get('https://api.spotify.com/v1/me')
    if me_json is None:
        return send_error_response('Could not retrieve user data')
    user_id = me_json['id']
    playlist_json = get('https://api.spotify.com/v1/users/' + user_id + '/playlists')
    if me_json is None:
        return send_error_response('Could not retrieve playlists')

    playlists = [{'name': pl['name'], 'id': pl['id'], 'href': pl['href']} for pl in playlist_json['items']]
    return render_template('index.html', playlists=playlists, loggedIn=True)


@require_api_token
def load_tracks(playlist_id):
    tracks = []
    while True:
        track_json = get('https://api.spotify.com/v1/playlists/' + playlist_id + '/tracks',
                         payload={'offset': session[PLAYLIST_OFFSET]})
        if track_json is None:
            socket_error('Could not retrieve tracks')
            return
        items = track_json['items']
        tracks.extend(Track.parse_json(items))
        session[PLAYLIST_OFFSET] += len(items)
        if session[PLAYLIST_OFFSET] > MAX_PLAYLIST_LENGTH:
            socket_error('Playlist too long')
            return None
        if len(items) < 100:
            break
    return tracks


def socket_error(message=''):
    emit('error', message)


def send_error_response(message=''):
    return make_response(render_template('index.html', error=True, message=message))


if __name__ == '__main__':
    socketio.run(app)
