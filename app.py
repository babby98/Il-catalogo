import ColorScheme as csc
import ColumnConfig
import HistVotes
import SidebarMenu

import streamlit as st
import pandas as pd 
import plotly.express as px

st.set_page_config(page_title="IL CATALOGO", layout="wide")

@st.cache_data

def load_data(pageName):
    sheet_id = "1OJXM5FtgFeDBllXsGmozXV2jAlLPiWif5vPqOjYx1Us"
    sheet_name = pageName.replace(" ", "%20")
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={sheet_name}"

    df=pd.read_csv(url, skiprows=0)

    df = df.iloc[:, 1:9]
    col_ssheet = ["ARTISTA", "ALBUM", "RELEASE", "", "LABEL", "VOTO", "GENERE", "TOP CANZONE"]
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
