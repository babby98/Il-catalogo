import streamlit as st

column_configuration = {
        "N.": st.column_config.Column(
            width=40,
            alignment="center"
        ),
        "ARTISTA": st.column_config.Column(
            width=230
        ),
        "ALBUM": st.column_config.Column(
            width=240
        ),
        "RELEASE": st.column_config.Column(
            width=120,
            alignment="center"
        ),
        "": st.column_config.Column(
            width=32,
            alignment="center"
        ),
        "LABEL": st.column_config.Column(
            width=170,
            alignment="center"  
        ),
        "VOTO": st.column_config.NumberColumn(
            format="%.10g",
            width=50,
            alignment="center"
        ),
        "GENERE": st.column_config.Column(
            width=130,
            alignment="center"
        )
    }