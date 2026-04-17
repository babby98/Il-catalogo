import streamlit as st

def sidebar_menu():
    if "pagina" not in st.session_state:
        st.session_state.pagina = "DAL 2015"

    st.markdown("""
        <style>
        [data-testid="stSidebar"] .stButton {
            margin: -8px 0;
        }
        [data-testid="stSidebar"] .stButton button {
            background: none;
            border: none;
            color: white;
            font-size: 16px;
            padding: 8px 12px;
            text-align: left;
            width: 100%;
            cursor: pointer;
        }
        [data-testid="stSidebar"] .stButton button:hover {
            background-color: rgba(255,255,255,0.1);
            border-radius: 6px;
        }
        </style>
    """, unsafe_allow_html=True)

    with st.sidebar:
        st.markdown("### IL CATALOGO")
        st.markdown("---")
        if st.button("DAL 2015"):
            st.session_state.pagina = "DAL 2015"
        if st.button("PRIMA DEL 2015"):
            st.session_state.pagina = "PRIMA DEL 2015"
        for i in range(2015, 2026+1):
            if st.button(str(i)):
                st.session_state.pagina = str(i)
            
    return st.session_state.pagina