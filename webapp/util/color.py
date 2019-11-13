import random


def generate_random_pastel_hsl():
    return 'hsl(' + str(random.randint(0, 360)) + ', 20%, ' + str(random.randint(30, 60))  + '%)'
