import abc


class Model:
    __metaclass__ = abc.ABCMeta

    def __init__(self, model_path):
        self.initialized = False
        self.model_path = model_path

    @abc.abstractmethod
    def initialize(self):
        '''
        Initializes the model
        '''
        pass

    @abc.abstractmethod
    def sort_playlist(self, playlist):
        '''
        Sorts the tracks in a given playlist

        :param playlist: the playlist to be sorted
        :return: a new playlist containing the sorted tracks
        '''
        pass
