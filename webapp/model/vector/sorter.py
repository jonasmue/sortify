import abc
from util.similarity import *


class Model:
    __metaclass__ = abc.ABCMeta

    def __init__(self):
        self.initialized = False

    @abc.abstractmethod
    def initialize(self):
        '''
        Initializes the model
        '''
        pass

    @abc.abstractmethod
    def sort_playlist(self, playlist, selected_track):
        '''
        Sorts the tracks in a given playlist

        :param playlist: the playlist to be sorted
        :param selected_track: the track the sorted playlist is supposed to start with
        :return: a new playlist containing the sorted tracks
        '''
        pass

    def sort_track_ids(self, start_idx, other_idcs, weights):
        '''
        Given a weight matrix and a start index this function greedily sorts
        the vectors at the other index positions in the weights matrix. Therefore,
        starting with the vector represented by the start index for each new index
        it finds the index position of the next closest vector

        :param start_idx: the start index
        :param other_idcs: the other indices to be sorted
        :param weights: weight matrix
        :return: a list of sorted indices starting with start_idx
        '''
        result = []
        result.append(start_idx)
        while len(other_idcs):
            closest_id = other_idcs.pop(find_closest_index(result[-1], other_idcs, weights))
            result.append(closest_id)
        return result
