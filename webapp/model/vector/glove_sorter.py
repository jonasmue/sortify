import pickle
from util.similarity import *
from model.vector.sorter import Model
from model.spotify.playlist import Playlist


class GloveSorter(Model):

    def __init__(self, model_path, track_map_path):
        super().__init__()
        self._model_path = model_path
        self._track_map_path = track_map_path

    def initialize(self):
        with open(self._track_map_path, "rb") as f:
            self.id2track = pickle.load(f)
        self.track2id = {v: k for k, v in self.id2track.items()}
        self.no_songs = len(self.track2id)
        raw_weights = np.load(self._model_path)['W']
        assert raw_weights.shape[0] == 2 * self.no_songs
        self.weights = (raw_weights[:self.no_songs, :] + raw_weights[self.no_songs, :]) / 2
        self.initialized = True

    def sort_playlist(self, playlist, selected_track):
        if not self.initialized:
            return None

        if (len(playlist.get_tracks()) <= 1):
            return Playlist(None, playlist.get_name() + ' [sortified]', None, None, playlist.get_tracks())

        first_track, remaining_tracks = self.assign_indices(selected_track, playlist)
        if first_track is None:
            return None

        self.audio_feature_matrix = playlist.audio_feature_matrix()
        if self.audio_feature_matrix is None:
            return None

        return Playlist(None, playlist.get_name() + ' [sortified]', None, None,
                        self.sort_tracks(first_track, remaining_tracks, playlist.get_name()))

    def sort_tracks(self, first_track, remaining_tracks, plist_name):
        '''

        :param first_track: the start track of the tupled form (track, index in weights file, index in playlist)
        :param remaining_tracks: contains the remaining tracks of the same form
        :return: the sorted playlist
        '''
        known_2_track = {t[1]: t for t in remaining_tracks if t[1] >= 0}
        known_audio_feature_2_track = {t[2]: t for t in remaining_tracks if t[1] >= 0}
        unknown_audio_feature_2_track = {t[2]: t for t in remaining_tracks if t[1] < 0}

        if first_track[1] >= 0:  # determine if track is known in our weights file
            raw_result = self.sort_starting_known(first_track, known_2_track, unknown_audio_feature_2_track, plist_name)
        else:
            raw_result = self.sort_starting_unknown(first_track, known_2_track, known_audio_feature_2_track,
                                                    unknown_audio_feature_2_track, plist_name)

        return [t[0] for t in raw_result]

    def sort_starting_known(self, first_track, known_2_track, unknown_audio_feature_2_track, plist_name):
        raw_result = []

        # We know the first track -> sort all known tracks after it
        known_sorted_idcs = self.sort_track_ids(first_track[1], list(known_2_track.keys()), self.weights)
        known_sorted_tracks = [first_track]
        known_sorted_tracks.extend([known_2_track[idx] for idx in known_sorted_idcs[1:]])  # First track already covered
        raw_result.extend(known_sorted_tracks)

        # self.save_figure(known_sorted_idcs, known_sorted_tracks, plist_name)

        if not len(unknown_audio_feature_2_track):
            return raw_result

        elif len(unknown_audio_feature_2_track) == 1:
            return raw_result + [list(unknown_audio_feature_2_track.values())[0]]

        # Then sort the unknown tracks based on their audio features
        last_known_track = raw_result[-1]
        unknown_sorted_idcs = self.sort_track_ids(last_known_track[2], list(unknown_audio_feature_2_track.keys()),
                                                  self.audio_feature_matrix)[1:]  # First track already covered
        unknown_sorted_tracks = [unknown_audio_feature_2_track[idx] for idx in unknown_sorted_idcs]
        raw_result.extend(unknown_sorted_tracks)

        return raw_result

    def sort_starting_unknown(self, first_track, known_2_track, known_audio_feature_2_track,
                              unknown_audio_feature_2_track, plist_name):
        raw_result = []

        # We do not know first track -> sort all unknown tracks after it based on their audio features
        unknown_sorted_idcs = self.sort_track_ids(first_track[2], list(unknown_audio_feature_2_track.keys()),
                                                  self.audio_feature_matrix)
        unknown_sorted_tracks = [first_track]
        unknown_sorted_tracks.extend(
            [unknown_audio_feature_2_track[idx] for idx in unknown_sorted_idcs[1:]])  # First track already covered
        raw_result.extend(unknown_sorted_tracks)
        last_unknown_track = raw_result[-1]

        if not len(known_2_track):
            return raw_result

        elif len(known_2_track) == 1:
            return raw_result + [list(known_2_track.values())[0]]

        # Then find most similar known track based on audio features
        known_audio_feature_indices = [last_unknown_track[2]] + sorted(
            list(known_audio_feature_2_track.keys()))  # prepend last track, sort list to later index it
        known_audio_features = self.audio_feature_matrix[known_audio_feature_indices]
        most_similar_known_track_idx = known_audio_feature_indices[
            find_most_similar(0, known_audio_features)[0][0]]  # Index 0 is prepended track vector
        most_similar_known_track = known_audio_feature_2_track[most_similar_known_track_idx]

        # Then sort all known tracks after it using known features
        remaining_known_track_idcs = [k for k in known_2_track.keys() if k != most_similar_known_track[1]]
        known_sorted_idcs = self.sort_track_ids(most_similar_known_track[1], remaining_known_track_idcs,
                                                self.weights)
        known_sorted_tracks = [known_2_track[idx] for idx in known_sorted_idcs]
        raw_result.extend(known_sorted_tracks)

        # self.save_figure(known_sorted_idcs, known_sorted_tracks, plist_name)
        return raw_result

    def assign_indices(self, selected_track, playlist):
        remaining_tracks = []
        first_track = None
        for i, track in enumerate(playlist.get_tracks()):
            track.augment_audio_features()
            assigned = (track, self.get_matrix_index(track), i)
            if track is not selected_track:
                remaining_tracks.append(assigned)
            else:
                first_track = assigned
        return first_track, remaining_tracks

    def get_matrix_index(self, track):
        artist_track = track.get_artists()[0].get_name() + "+" + track.get_name()
        return self.track2id.get(artist_track, -1)

    def save_figure(self, known_sorted_idcs, known_sorted_tracks, plist_name):
        vectors = self.weights[known_sorted_idcs]
        labels = [t[0].get_name() for t in known_sorted_tracks]
        save_tsne_plot(vectors, labels, plist_name)
