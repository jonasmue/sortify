import os

CLIENT_ID = os.environ['CLIENT_ID']
CLIENT_SECRET = os.environ['CLIENT_SECRET']
REDIRECT_URI = 'http://localhost:5000/callback'
SCOPE = 'playlist-read-collaborative playlist-read-private'

STATE_KEY = 'spotify_auth_state'

API_SESSION_TOKEN = 'api_session_token'

SELECTED_PLAYLIST = 'selected_playlist'
PLAYLIST_OFFSET = 'playlist_offset'

MAX_PLAYLIST_LENGTH = 1000

DATA_DIR = "data"
MODEL_URL = os.path.join(DATA_DIR, "glove_model.npz")
TRACK_MAP_URL = os.path.join(DATA_DIR, "track_map.dms")
