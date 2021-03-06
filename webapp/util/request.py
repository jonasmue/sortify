import requests
from util.api import *


def get(url, socket, payload=None):
    if API_SESSION_TOKEN not in session:
        return None
    headers = {'Authorization': 'Bearer ' + session[API_SESSION_TOKEN]}

    try:
        r = requests.get(url, headers=headers, params=payload)
    except requests.exceptions.RequestException as e:  # This is the correct syntax
        print(e)
        return None
    tries = 0
    while r.status_code == 429 and tries < 3:
        socket.sleep(5)
        r = requests.get(url, headers=headers, params=payload)
        tries += 1
    if r.status_code != 200:
        print("Status Code", r.status_code)
        return None
    return r.json()


def post(url, headers, payload, json=None):
    try:
        r = requests.post(url, headers=headers, data=payload, json=json)
    except requests.exceptions.RequestException as e:
        print(e)
        return None
    if r.status_code != 200 and r.status_code != 201:
        print("Status Code", r.status_code)
        return None
    return r.json()
