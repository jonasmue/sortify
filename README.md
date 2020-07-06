# Sortify

This repository holds the code of the Sortify Webapp. To learn more about Sortify, please read this article: https://jonasportfol.io/posts/sortify

Due to server capacity limitations, Sortify is not online at the moment.

## Installation Instructions (macOS, Linux)

### Step 1: Create Spotify Developer App
1. Register at https://developer.spotify.com
2. Create a new app here: https://developer.spotify.com/dashboard/applications
3. Note your application's `CLIENT_ID` and `CLIENT_SECRET`

### Step 2: Clone Repository and Setup Virtual Environment
1. `git clone git@github.com:jonasmue/sortify.git`
2. `cd sortify/webapp`
3. `pip3 install virtualenv`
4. `virtualenv venv`
5. `source venv/bin/activate`
6. `pip install -r requirements.txt`

### Step 3: Assign Environment Variables
1. `export CLIENT_ID={YOUR CLIENT ID}`, for example `export CLIENT_ID=aajfjal3lkalkj`
2. `export CLIENT_SECRET={YOUR CLIENT SECRET}`, for example `export CLIENT_SECRET=cckljkljsdkckklsdj3l2`

To persist environment variables follow this guide: https://pybit.es/persistent-environment-variables.html

### Step 4: Start Sortify
1. `python main.py` – On the first start, the GloVe model will be downloaded which might take a while depending on your internet connection
2. In your browser navigate to http://localhost:8000 and start sorting your playlists!

