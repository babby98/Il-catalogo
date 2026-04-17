import pandas as pd

def color_award_list(award):
    bgColor = {
        1: "#fb8f67",
        2: "#17e8a9",
        3: "#368f8b",
        4: "#f5df4d"
    }
    return bgColor.get(award, "#181818")

def color_vote_list(voto):

    voto = round(voto, 1)

    iVoto = int(voto)
    decVoto = voto - iVoto

    d = round(decVoto * 10)

    if voto < 8:
        if d == 0:
            voto = iVoto
        elif 0 < d <= 4:
            voto = iVoto + 0.2
        elif d == 5:
            voto = iVoto + 0.5
        elif 5 < d <= 9:
            voto = iVoto + 0.8

    bgColor = {
        0:   "#0f172a",  
        0.2: "#2b1d2a",
        0.5: "#452028",
        0.8: "#602125",
        1:   "#7b1e1e",
        1.2: "#922121",
        1.5: "#aa2323",
        1.8: "#c32525",
        2:   "#dc2626",
        2.2: "#df3922",
        2.5: "#e3481d",
        2.8: "#e65517",
        3:   "#e9610c",
        3.2: "#ed6a0e",
        3.5: "#f17211",
        3.8: "#f57b13",
        4:   "#f98315",
        4.2: "#fc9b25",
        4.5: "#ffb333",
        4.8: "#ffca40",
        5:   "#ffe14c",
        5.2: "#e7dd4a",
        5.5: "#ced948",
        5.8: "#b5d545",
        6:   "#9ad043",
        6.2: "#81c44c",
        6.5: "#66b952",
        6.8: "#48ad57",
        7:   "#1ba15a",
        7.2: "#198c5d",
        7.5: "#157156",
        7.8: "#128470",
        8:   "#117a75",
        8.1: "#16837e",
        8.2: "#1a8c87",
        8.3: "#1e9690",
        8.4: "#239f99",
        8.5: "#27a9a2",
        8.6: "#18999e",
        8.7: "#148999",
        8.8: "#197991",
        8.9: "#1f6987",
        9:   "#24597b",
        9.1: "#3e5c9e",
        9.2: "#6958b7",
        9.3: "#984ebf",
        9.4: "#c93faf",
        9.5: "#f72585",
        9.6: "#c4309d",
        9.7: "#9136a1",
        9.8: "#613793",
        9.9: "#373379",
        10:  "#152b56"
    }

    if voto > 5.5 or voto < 4.5:
        tColor = "#ffffff"
    else:
        tColor = "#252525"

    return [bgColor.get(voto, "#181818"), tColor]

def color_vote(voto):

    dCol = color_vote_list(voto)

    return f'background-color: {dCol[0]};color: {dCol[1]}; font-weight: bold;'

def style_empty_col(val):
    if val == "" or pd.isna(val):
        return ""
    try:
        v = float(val)
        bg_color = color_award_list(v)
        return f'background-color: {bg_color}; color: transparent;'
    except:
        return ""
    
def index_color(val):
    return 'background-color: '+ "#1b263b" +'; color: '+ '#e0e1dd' +'; font-weight: bold;'