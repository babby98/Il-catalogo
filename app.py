import ColorScheme as csc
import ColumnConfig
import HistVotes

import streamlit as st
import pandas as pd 
import plotly.express as px

st.set_page_config(page_title="IL CATALOGO", layout="wide")
st.title("IL CATALOGO")

@st.cache_data

def load_data():
    sheet_id = "1OJXM5FtgFeDBllXsGmozXV2jAlLPiWif5vPqOjYx1Us"
    sheet_name = "DAL%202015"
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={sheet_name}"

    df=pd.read_csv(url, skiprows=0)

    df = df.iloc[:, 1:9]
    col_ssheet = ["ARTISTA", "ALBUM", "RELEASE", "", "LABEL", "VOTO", "GENERE", "TOP CANZONE"]
    df.columns = col_ssheet

    df = df.dropna(subset=['ARTISTA'])

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
    df = load_data()
    col_tab, col_hist = st.columns([5, 3])

    with col_tab:
        st.subheader("Album ascoltati dal 2015 in poi")
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
