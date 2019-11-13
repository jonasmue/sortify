import numpy as np

from model.spotify.audio_features import AudioFeatureVector
from util.color import *


class Playlist:

    @staticmethod
    def parse_json(json):
        return [Playlist.parse_json_single_playlist(item) for item in json['items']]

    @staticmethod
    def parse_json_single_playlist(json):
        playlist = Playlist(
            json['id'],
            json['name'],
            json['href'],
            json['uri'],
            None)
        return playlist

    def __init__(self, id, name, href, uri, tracks):
        self._id = id
        self._name = name
        self._href = href
        self._uri = uri
        self._tracks = tracks
        self._color = generate_random_pastel_hsl()

    def __eq__(self, other):
        if not isinstance(other, Playlist):
            return False
        return self.get_id() == other.get_id()

    def get_id(self):
        return self._id

    def set_id(self, id):
        self._id = id

    def get_name(self):
        return self._name

    def get_href(self):
        return self._href

    def set_href(self, href):
        self._href = href

    def get_uri(self):
        return self._uri

    def get_tracks(self):
        return self._tracks

    def set_tracks(self, tracks):
        self._tracks = tracks

    def get_track_uris(self):
        return [t.get_uri() for t in self._tracks]

    def get_track_ids(self):
        return [t.get_id() for t in self._tracks]

    def get_track_names(self):
        return [t.get_name() for t in self._tracks]

    def find_track_by_id(self, id):
        for track in self._tracks:
            if track.get_id() == id:
                return track
        return None

    def get_color(self):
        return self._color

    def to_dict(self):
        return {
            'id': self.get_id(),
            'name': self.get_name(),
            'href': self.get_href(),
            'uri': self.get_uri(),
            'tracks': [t.to_dict() for t in self.get_tracks()] if self.get_tracks() is not None else [],
            'color': self.get_color()
        }

    def audio_feature_matrix(self):
        matrix = np.zeros((len(self.get_tracks()), AudioFeatureVector.N_FEATURES))
        for i, track in enumerate(self.get_tracks()):
            if 'audio_features' not in track.to_dict().keys():
                return None
            matrix[i] = track.get_audio_features().to_vec()
        return matrix
