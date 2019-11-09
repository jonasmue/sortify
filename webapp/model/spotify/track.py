class Track:

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
