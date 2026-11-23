import json
import time
import streamlit as st
from dojo import config, scenarios, customer_agent, coach_agent, guardrails, scoring, storage

st.set_page_config(page_title="Claims Calling Assessment", page_icon="📞")
storage.init_db()

scn = scenarios.get(config.HIRING_SCENARIO_ID)
mcq = json.loads((config.DATA / "mcq.json").read_text(encoding="utf-8"))
ss = st.session_state
ss.setdefault("stage", "intro")


def finish():
    tr = ss.transcript
    flags = guardrails.scan(tr)
    with st.spinner("Submitting your assessment…"):
        report = scoring.finalize(scn, tr, coach_agent.evaluate(scn, tr, flags), flags)
    roleplay = report["overall"]
    mcq_pct = round(100 * ss.mcq_score / len(mcq))
    report.update({
        "roleplay_overall": roleplay,
        "mcq_pct": mcq_pct,
        "overall": round(0.7 * roleplay + 0.3 * mcq_pct),
    })
    storage.save_session("hiring", ss.cand_name, ss.cand_email, scn["id"], tr, report)
    ss.stage = "done"


if ss.stage == "intro":
    st.title("Claims calling assessment")
    st.write(f"About {config.HIRING_MINUTES} minutes: three short questions, then one practice call with an AI customer.")
    st.info("An AI scores this assessment, and a human recruiter reviews every result before any decision. "
            "We judge your approach, not your spelling or typing speed.")
    name = st.text_input("Full name")
    email = st.text_input("Email")
    agreed = st.checkbox("I understand that an AI will score my answers.")
    if st.button("Start", disabled=not (name and email and agreed)):
        if storage.has_attempted(email, scn["id"]):
            st.error("This email has already completed the assessment.")
        else:
            ss.cand_name, ss.cand_email, ss.stage = name, email, "mcq"
            st.rerun()

elif ss.stage == "mcq":
    st.header("Part 1: Quick judgement")
    with st.form("mcq_form"):
        picks = [st.radio(q["q"], q["options"], index=None, key=f"q{i}") for i, q in enumerate(mcq)]
        submitted = st.form_submit_button("Continue")
    if submitted:
        if None in picks:
            st.warning("Please answer every question.")
        else:
            ss.mcq_score = sum(1 for p, q in zip(picks, mcq) if p == q["options"][q["answer"]])
            ss.transcript = customer_agent.start(scn)
            ss.t0 = time.time()
            ss.stage = "call"
            st.rerun()

elif ss.stage == "call":
    tr = ss.transcript
    turns = sum(1 for t in tr if t["speaker"] == "trainee")
    elapsed = time.time() - ss.t0

    st.header("Part 2: Live call")
    st.caption(f"You are the claims adjuster. Replies used: {turns}/{config.HIRING_MAX_TURNS}")
    for t in tr:
        with st.chat_message("assistant" if t["speaker"] == "customer" else "user"):
            st.write(t["text"])

    over = (turns >= config.HIRING_MAX_TURNS
            or elapsed > config.HIRING_MINUTES * 60
            or tr[-1].get("ended", False))
    if over:
        finish()
        st.rerun()

    msg = st.chat_input("Reply to the customer…")
    if msg:
        tr.append({"speaker": "trainee", "text": msg})
        with st.spinner("The customer is responding…"):
            out = customer_agent.reply(scn, tr)
        tr.append({"speaker": "customer", **out})
        st.rerun()
    if st.button("Finish call", disabled=turns < 2):
        finish()
        st.rerun()

else:
    st.success("Thank you. Your assessment has been submitted and the recruiting team will be in touch.")
