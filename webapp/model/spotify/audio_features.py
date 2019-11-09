class AudioFeatureVector:
    MAX_TEMPO = 230.0

    def __init__(self, acousticness, danceability, energy,
                 instrumentalness, liveness, loudness,
                 speechiness, valence, tempo):
        self._acousticness = acousticness
        self._danceability = danceability
        self._energy = energy
        self._instrumentalness = instrumentalness
        self._liveness = liveness
        self._loudness = loudness
        self._speechiness = speechiness
        self._valence = valence
        self._tempo = tempo

    def get_acousticness(self):
        return self._acousticness

    def get_danceability(self):
        return self._danceability

    def get_energy(self):
        return self._energy

    def get_instrumentalness(self):
        return self._instrumentalness

    def get_liveness(self):
        return self._liveness

    def get_loudness(self):
        return self._loudness

    def get_speechiness(self):
        return self._speechiness

    def get_valence(self):
        return self._valence

    def get_tempo(self):
        return min(1, self._tempo / AudioFeatureVector.MAX_TEMPO)  # Normalize tempo

    def to_dict(self):
        return {
            'acousticness': self.get_acousticness(),
            'danceability': self.get_danceability(),
            'energy': self.get_energy(),
            'instrumentalness': self.get_instrumentalness(),
            'liveness': self.get_liveness(),
            'loudness': self.get_loudness(),
            'speechiness': self.get_speechiness(),
            'valence': self.get_valence(),
            'tempo': self.get_tempo()
        }
