import os

CLIENT_ID = os.environ['CLIENT_ID']
CLIENT_SECRET = os.environ['CLIENT_SECRET']
REDIRECT_URI = 'http://sortify.ddns.net/callback'
SCOPE = 'playlist-read-collaborative playlist-read-private playlist-modify-private'

STATE_KEY = 'spotify_auth_state'

API_SESSION_TOKEN = 'api_session_token'
SPOTIFY_USER = 'spotify_user'
LOGIN_TIMESTAMP = 'login_timestamp'
LOGIN_TIME = 3600

SELECTED_PLAYLIST = 'selected_playlist'
PLAYLIST_OFFSET = 'playlist_offset'
PLAYLISTS_FULLY_LOADED = 'playlists_fully_loaded'

NUM_PLAYLIST_REQUEST = 20
MAX_PLAYLIST_LENGTH = 300

DATA_URL = "https://storage.googleapis.com/sortify-260106.appspot.com/data"
MODEL_URL = os.path.join(DATA_URL, "glove_model.npz")
TRACK_MAP_URL = os.path.join(DATA_URL, "track_map.dms")
