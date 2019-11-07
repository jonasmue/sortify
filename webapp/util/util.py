import random

from util.constants import *

from functools import wraps
from flask import session, make_response


def generate_random_string(length):
    possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    return ''.join(random.choice(possible) for _ in range(length))


def require_api_token(func):
    @wraps(func)
    def check_token(*args, **kwargs):
        # Check to see if it's in their session
        if API_SESSION_TOKEN not in session:
            # If it isn't return our access denied message (you can also return a redirect or render_template)
            return make_response('Access denied')

        # Otherwise just send them where they wanted to go
        return func(*args, **kwargs)

    return check_token
