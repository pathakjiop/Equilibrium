import streamlit as st

LABELS = {"empathy": "Empathy", "accuracy": "Accuracy", "compliance": "Compliance",
          "de_escalation": "De-escalation", "fraud_awareness": "Fraud awareness"}


def mood_label(m: int) -> str:
    return "Furious" if m > 75 else "Upset" if m > 55 else "Uneasy" if m > 35 else "Calmer"


def render_report(r: dict) -> None:
    st.header(f"Overall score: {r['overall']}/100")
    if "mcq_pct" in r:
        st.caption(f"Roleplay: {r['roleplay_overall']}/100  |  Quick questions: {r['mcq_pct']}%")
    st.write(r.get("summary", ""))
    if r.get("integrity_alert"):
        st.warning("The trainee tried to manipulate the AI. Review the transcript.")

    cols = st.columns(len(r["scores"]))
    for col, (k, v) in zip(cols, r["scores"].items()):
        col.metric(LABELS[k], f"{v}/10")

    if r.get("flags"):
        st.subheader("Rule violations caught automatically")
        for f in r["flags"]:
            st.error(f'{f["label"]}: "{f["text"]}"')

    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Strengths")
        for s in r.get("strengths", []):
            st.write("- " + s)
    with c2:
        st.subheader("To improve")
        for s in r.get("improvements", []):
            st.write("- " + s)

    st.subheader("Moments that mattered")
    for m in r.get("key_moments", []):
        text = f'**"{m["quote"]}"**\n\n{m["why"]}'
        if m.get("better_line"):
            text += f'\n\nTry: "{m["better_line"]}"'
        (st.success if m.get("verdict") == "good" else st.error)(text)
