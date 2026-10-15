import ColorScheme as csc
import ColumnConfig
import HistVotes
import SidebarMenu

import requests
import streamlit as st
import pandas as pd 
import plotly.express as px
import time

st.set_page_config(page_title="IL CATALOGO", layout="wide")

@st.cache_data

def get_lastfm_scrobbles(artist, album, api_key, username):
    url = "http://ws.audioscrobbler.com/2.0/"
    params = {
        "method": "album.getinfo",
        "api_key": api_key,
        "artist": artist,
        "album": album,
        "username": username, # Importante: serve a dire di chi vogliamo gli ascolti
        "format": "json"
    }
    try:
        response = requests.get(url, params=params).json()
        # Navighiamo nel JSON di risposta per trovare il playcount dell'utente
        return response['album']['userplaycount']
    except (KeyError, Exception):
        return 0 # Ritorna 0 se il disco non viene trovato o non ci sono ascolti

def load_data(pageName):
    sheet_id = "1OJXM5FtgFeDBllXsGmozXV2jAlLPiWif5vPqOjYx1Us"
    sheet_name = pageName.replace(" ", "%20")
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={sheet_name}"

    df=pd.read_csv(url, skiprows=0)

    df = df.iloc[:, 1:10]
    col_ssheet = ["ARTISTA", "ALBUM", "RELEASE", "", "LABEL", "VOTO", "GENERE", "TOP CANZONE", "SCROBBLES"]
    df.columns = col_ssheet

    df = df.dropna(subset=['ARTISTA'])
    df = df.dropna(subset=['VOTO'])

    df['ARTISTA'] = df['ARTISTA'].astype(str).str.title()
    df['ALBUM'] = df['ALBUM'].astype(str).str.title()
    df['VOTO'] = df['VOTO'].astype(str).str.replace(',', '.').astype(float)
    df[""] = df[""].fillna("")
    df['LABEL'] = df['LABEL'].fillna("")
    df["TOP CANZONE"] = df["TOP CANZONE"].fillna("")
    df['TOP CANZONE'] = df['TOP CANZONE'].astype(str).str.title()

    df.index = df.index + 1
    df.index.name = 'N.'

    df = df.reset_index()
    
    return df

try:
    pageName = SidebarMenu.sidebar_menu()

    df = load_data(pageName)
    col_tab, col_hist = st.columns([2, 1])

    # Esempio di integrazione nel tuo loop o trasformazione del dataframe
    API_KEY = "e41a6874e211bc73ebc9ae65993ab928"
    USER = "Babby98"

    if st.button("Aggiorna statistiche ascolti"):
        status_text = st.empty()
        # Supponendo che 'df' sia il tuo DataFrame con le colonne 'Artista' e 'Titolo'
        with st.spinner('Recupero ascolti da Last.fm...'):
            for index, row in df.iterrows():
                sMessage = f"{index}/{len(df)} Caricamento dati per: **{row['ARTISTA']}** - {row['ALBUM']}"
                status_text.markdown(sMessage)

                scrobble = get_lastfm_scrobbles(row['ARTISTA'], row['ALBUM'], API_KEY, USER)
                df.at[index, 'SCROBBLES'] = scrobble

        status_text.success("Fatto!")

    with col_tab:
        st.subheader(f"Album ascoltati {pageName.lower()}")
        styled_df = df.style.map(csc.color_vote, subset=['VOTO']) \
                            .map(csc.style_empty_col, subset=['']) \
                            .map(csc.index_color, subset=['N.'])
    

        st.dataframe(styled_df,
                    width='content',
                    column_config=ColumnConfig.column_configuration,
                    hide_index=True,
                    height=765
                )

        st.caption(f"Album totali: {len(df)}")

    with col_hist:
        HistVotes.hist_votes(df)


except Exception as e:
    st.error(f"ERRORE: caricamento dati fallito. Dettagli: {e}")
