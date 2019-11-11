import numpy as np
from model.spotify.audio_features import AudioFeatureVector


class Playlist:

    def __init__(self, id, name, href, tracks):
        self._id = id
        self._name = name
        self._href = href
        self._tracks = tracks

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

    def get_tracks(self):
        return self._tracks

    def set_tracks(self, tracks):
        self._tracks = tracks

    def return_track_ids(self):
        return [t.get_id() for t in self._tracks]

    def get_track_names(self):
        return [t.get_name() for t in self._tracks]

    def find_track_by_id(self, id):
        for track in self._tracks:
            if track.get_id() == id:
                return track
        return None

    def to_dict(self):
        return {
            'id': self.get_id(),
            'name': self.get_name(),
            'href': self.get_href(),
            'tracks': [t.to_dict() for t in self.get_tracks()]
        }

    def audio_feature_matrix(self):
        matrix = np.array((len(self.get_tracks()), AudioFeatureVector.N_FEATURES))
        for i, track in enumerate(self.get_tracks()):
            if 'audio_features' not in track.to_dict().keys():
                return None
            matrix[i] = track.get_audio_features().to_vec()
        return matrix
