import ColorScheme as csc

import plotly.express as px
import streamlit as st
import pandas as pd

def hist_votes(df):
    st.subheader("Distribuzione dei voti dal 2015")
    df_hist = df.copy()
    df_hist['VOTO_INT'] = df_hist['VOTO'].apply(lambda x: int(x))
    vote_counts = df_hist['VOTO_INT'].value_counts().sort_index().reset_index()
    vote_counts.columns = ['VOTO', 'COUNT']

    colors = vote_counts['VOTO'].apply(lambda x: csc.color_vote_list(float(x))[0]).tolist()

    fig = px.bar(
        vote_counts,
        x='COUNT',
        y='VOTO',
        orientation='h',
        text='COUNT'
    )

    fig.update_traces(
        textposition='outside',
        textfont_size=13,
        marker_color = colors
    )

    fig.update_layout(
        xaxis_title='Numero di album ascoltati',
        yaxis_title='Voto',
        yaxis=dict(tickmode='linear', dtick=1),
        showlegend=False,
        plot_bgcolor='#0e1117',
        paper_bgcolor='#0e1117',
        font=dict(color='white'),
        height=500
    )

    st.plotly_chart(fig, use_container_width=True)