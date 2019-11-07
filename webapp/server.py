from base64 import b64encode
from urllib.parse import urlencode

from flask import Flask, request, render_template, redirect
from flask_socketio import SocketIO, emit

from util.request import *

app = Flask(__name__)
app.config['SECRET_KEY'] = generate_random_string(32)
socketio = SocketIO(app)


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
    playlist_id = data['playlist_id']
    session[SELECTED_PLAYLIST] = playlist_id
    session[PLAYLIST_OFFSET] = 100
    load_tracks(playlist_id)


@socketio.on('loadMoreTracks')
@require_api_token
def load_more_tracks():
    if SELECTED_PLAYLIST not in session:
        return
    if session[PLAYLIST_FULLY_LOADED]:
        return
    offset = session[PLAYLIST_OFFSET]
    session[PLAYLIST_OFFSET] += 100
    playlist_id = session[SELECTED_PLAYLIST]
    load_tracks(playlist_id, offset)


@socketio.on('trackSelected')
@require_api_token
def sort_playlist(data):
    track_id = data['track_id']
    track_name = data['track_name']
    track_artist = data['track_artist']
    print(track_id, track_name, track_artist)


###########################################
################# HELPERS #################
###########################################

@require_api_token
def get_playlists():
    me_json = get('https://api.spotify.com/v1/me')
    if me_json is None:
        return send_error_response("Could not retrieve user data")
    user_id = me_json['id']
    playlist_json = get('https://api.spotify.com/v1/users/' + user_id + '/playlists')
    if me_json is None:
        return send_error_response("Could not retrieve playlists")

    playlists = [{'name': pl['name'], 'id': pl['id']} for pl in playlist_json['items']]
    return render_template('index.html', playlists=playlists, loggedIn=True)


def load_tracks(playlist_id, offset=None):
    track_json = get('https://api.spotify.com/v1/playlists/' + playlist_id + '/tracks', payload={'offset': offset})
    if track_json is None:
        socket_error("Could not retrieve tracks")
        return
    tracks = track_json['items']
    session[PLAYLIST_FULLY_LOADED] = len(tracks) < 100
    emit('playlistTracks', tracks)


def socket_error(message=''):
    emit('error', message)


def send_error_response(message=''):
    return make_response(render_template('index.html', error=True, message=message))


if __name__ == '__main__':
    socketio.run(app)
