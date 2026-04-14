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

    df=pd.read_csv(url)
    df.columns = [c.strip() for c in df.columns]
    return df

try:
    df = load_data()
    
    st.sidebar.header("Filtri")

except Exception as e:
    st.error(f"ERRORE: caricamento dati fallito. Dettagli: {e}")