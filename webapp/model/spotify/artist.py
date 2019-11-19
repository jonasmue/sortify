class Artist:

    @staticmethod
    def parse_json(json):
        return [Artist(a['id'], a['name'], a['external_urls']['spotify']) for a in json]

    def __init__(self, id, name, href):
        self._id = id
        self._name = name
        self._href = href

    def __eq__(self, other):
        if not isinstance(other, Artist):
            return False
        return self.get_id() == other.get_id()

    def get_id(self):
        return self._id

    def get_name(self):
        return self._name

    def get_href(self):
        return self._href

    def to_dict(self):
        return {
            'id': self.get_id(),
            'name': self.get_name(),
            'href': self.get_href()
        }
