import numpy as np


def cosine_matrix(matrix, vec):
    return matrix.dot(vec) / (np.linalg.norm(matrix, axis=1) * np.linalg.norm(vec))


def find_similar(target_index, weights, f, k=1):
    vec = weights[target_index]
    W_tmp = np.delete(weights, target_index, axis=0)
    distances = f(W_tmp, vec)
    min_indices = np.argpartition(distances, k)[:k]
    result = []
    for idx in min_indices:
        idx = idx if idx < target_index else idx + 1
        sim_score = distances[idx]
        result.append((idx, sim_score))
    return sorted(result, key=lambda x: x[1])


def find_least_similar(target_index, weights, k=1):
    f = lambda W_tmp, vec: cosine_matrix(W_tmp, vec)
    return find_similar(target_index, weights, f, k)


def find_most_similar(target_index, weights, k=1):
    f = lambda W_tmp, vec: 1 - cosine_matrix(W_tmp, vec)
    return find_similar(target_index, weights, f, k)


def find_closest_index(this_index, other_indices, weights):
    this_vector = weights[this_index]
    other_vectors = weights[other_indices]
    distances = 1 - cosine_matrix(other_vectors, this_vector)
    return distances.argmin()
