import json
import pandas as pd
import streamlit as st
from dojo import config, storage, ui

st.set_page_config(page_title="Recruiter dashboard", page_icon="📋", layout="wide")
storage.init_db()

if not config.RECRUITER_PASSWORD:
    st.error("Set DOJO_RECRUITER_PASSWORD in your .env file.")
    st.stop()
if st.text_input("Password", type="password") != config.RECRUITER_PASSWORD:
    st.stop()

rows = storage.list_sessions("hiring")
if not rows:
    st.info("No candidates yet.")
    st.stop()

df = pd.DataFrame([{
    "id": r["id"], "candidate": r["candidate"], "email": r["email"],
    "overall": r["overall"], "submitted": r["created_at"],
} for r in rows]).sort_values("overall", ascending=False)

st.title("Candidate results")
st.caption("Scores are a decision aid. A human should make the final call.")
st.dataframe(df, hide_index=True)

names = dict(zip(df["id"], df["candidate"]))
pick = st.selectbox("Open candidate", list(df["id"]), format_func=lambda i: f"{names[i]} (#{i})")
row = next(r for r in rows if r["id"] == pick)

ui.render_report(json.loads(row["report"]))
with st.expander("Full transcript"):
    for t in json.loads(row["transcript"]):
        st.write(f'**{"Customer" if t["speaker"] == "customer" else "Candidate"}:** {t["text"]}')
