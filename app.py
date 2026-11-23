import streamlit as st
from dojo import scenarios, customer_agent, coach_agent, guardrails, scoring, storage, ui

st.set_page_config(page_title="Adjuster Dojo", page_icon="🥋", layout="wide")
storage.init_db()


def end_call():
    scn, tr = st.session_state.scn, st.session_state.transcript
    flags = guardrails.scan(tr)
    with st.spinner("Your coach is reviewing the call…"):
        report = coach_agent.evaluate(scn, tr, flags)
        report = scoring.finalize(scn, tr, report, flags)
    storage.save_session("practice", "", "", scn["id"], tr, report)
    st.session_state.report = report


# 1) Scenario picker
if "scn" not in st.session_state:
    st.title("🥋 Adjuster Dojo")
    st.write("Practice hard claim calls before the real ones. Pick a customer.")
    cols = st.columns(2)
    for i, s in enumerate(scenarios.load_all()):
        with cols[i % 2]:
            st.subheader(s["title"])
            st.caption(f'Difficulty: {s["difficulty"]}')
            st.write(s["summary"])
            if st.button("Start this call", key=s["id"]):
                st.session_state.scn = s
                st.session_state.transcript = customer_agent.start(s)
                st.rerun()
    st.stop()

scn = st.session_state.scn
tr = st.session_state.transcript

# 3) Scorecard
if "report" in st.session_state:
    ui.render_report(st.session_state.report)
    with st.expander("Full transcript"):
        for t in tr:
            st.write(f'**{"Customer" if t["speaker"] == "customer" else "You"}:** {t["text"]}')
    if st.button("Try another customer"):
        for k in ("scn", "transcript", "report"):
            st.session_state.pop(k, None)
        st.rerun()
    st.stop()

# 2) Live call
mood = next(t["emotion"] for t in reversed(tr) if t["speaker"] == "customer")

with st.sidebar:
    st.subheader("Case file")
    for k, v in scn["case_facts"].items():
        st.write(f"**{k.replace('_', ' ').title()}:** {v}")
    st.subheader("Company rules")
    for r in scn["rules"]:
        st.write("- " + r)
    if st.button("End call and get scorecard", disabled=len(tr) < 3):
        end_call()
        st.rerun()

chat_col, mood_col = st.columns([4, 1])
with mood_col:
    st.metric("Customer mood", ui.mood_label(mood))
    st.progress(mood / 100)
with chat_col:
    st.title(scn["title"])
    for t in tr:
        with st.chat_message("assistant" if t["speaker"] == "customer" else "user"):
            st.write(t["text"])

ended = tr[-1].get("ended", False)
if ended:
    st.info("The customer ended the call. Click “End call” in the sidebar for your scorecard.")

msg = st.chat_input("Reply to the customer…", disabled=ended)
if msg:
    tr.append({"speaker": "trainee", "text": msg})
    with st.spinner("The customer is responding…"):
        out = customer_agent.reply(scn, tr)
    tr.append({"speaker": "customer", **out})
    st.rerun()
