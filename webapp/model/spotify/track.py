from model.spotify.artist import Artist


class Track:

    @staticmethod
    def parse_json(json):
        tracks = []
        for item in json:
            track = item['track']
            id = track['id']
            name = track['name']
            artists = Artist.parse_json(track['artists'])
            href = track['href']
            preview_url = track['preview_url']
            tracks.append(Track(id, name, artists, href, preview_url))
        return tracks

    def __init__(self, id, name, artists, href, preview_url):
        self._id = id
        self._name = name
        self._artists = artists
        self._href = href
        self._preview_url = preview_url

    def get_id(self):
        return self._id

    def get_name(self):
        return self._name

    def get_artists(self):
        return self._artists

    def get_href(self):
        return self._href

    def get_preview_url(self):
        return self._preview_url

    def get_audio_features(self):
        return self._audio_features

    def set_audio_features(self, audio_features):
        self._audio_features = audio_features

    def to_dict(self):
        return {
            'id': self.get_id(),
            'name': self.get_name(),
            'artists': [a.to_dict() for a in self.get_artists()],
            'href': self.get_href(),
            'preview_url': self.get_preview_url(),
            'audio_features': self.get_audio_features().to_dict() if hasattr(self, '_audio_features') else None
        }
