class Artist:

    def __init__(self, id, name, href):
        self._id = id
        self._name = name
        self._href = href

    def get_id(self):
        return self._id

    def get_name(self):
        return self._name

    def get_href(self):
        return self._href
