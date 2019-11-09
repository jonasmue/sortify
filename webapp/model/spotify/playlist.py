class Playlist:

    def __init__(self, id, name, href, tracks):
        self._id = id
        self._name = name
        self._href = href
        self._tracks = tracks

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
