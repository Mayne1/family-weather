"use client";

import { useState } from "react";

const activities = [
  ["cookout", "♨", "Cookout"],
  ["birthday", "✦", "Birthday"],
  ["park day", "♧", "Park day"],
  ["game", "◉", "Game"],
  ["concert", "♫", "Concert"],
  ["plan", "＋", "Something else"],
];

const dates = [
  ["SAT", "22", "Today"],
  ["SUN", "23", "Tomorrow"],
  ["MON", "24", "Monday"],
  ["MORE", "＋", "Choose"],
];

const forecast = [
  ["TODAY", "Saturday", "☀", "86°", "Best bet", "after 4 PM", "featured"],
  ["TOMORROW", "Sunday", "◒", "83°", "Easy day", "for outdoor plans", ""],
  ["MON", "Monday", "☁", "78°", "Comfortable", "most of the day", ""],
  ["TUE", "Tuesday", "☂", "72°", "Have cover", "ready after 2 PM", "caution"],
];

export default function Home() {
  const [activity, setActivity] = useState("cookout");
  const [date, setDate] = useState(0);
  const [showResult, setShowResult] = useState(false);

  return (
    <>
      <div className="weatherScene" aria-hidden="true">
        <span className="sunGlow" />
        <span className="cloud cloudOne" />
        <span className="cloud cloudTwo" />
      </div>

      <header className="siteHeader">
        <a className="brand" href="#top" aria-label="Family Weather home">
          <span className="brandMark"><i /><i /><i /></span>
          <span><strong>Family Weather</strong><small>Plan together. Weather better.</small></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#planner">Plan</a><a href="#outlook">Outlook</a><a href="#how">How it works</a>
        </nav>
        <div className="headerActions">
          <button className="textButton" type="button">Sign in</button>
          <button className="pillButton" type="button">Create event</button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="heroCopy">
            <p className="eyebrow"><span /> Stockton · Saturday, August 22</p>
            <h1>Make the plan.<br /><em>Know the weather.</em></h1>
            <p className="intro">Family Weather turns the forecast into a simple decision—when to go, what to expect, and what your people need to know.</p>
            <div className="decisionCard">
              <div className="decisionTop"><span className="statusDot" /><span>Best outdoor window</span><strong>4–7 PM</strong></div>
              <div className="decisionMain">
                <div><span className="temperature">82°</span><span className="condition">Clear skies<br />Light breeze</span></div>
                <div className="score" aria-label="Weather fit score 92 out of 100"><span>92</span><small>FIT</small></div>
              </div>
              <p><strong>Go for it.</strong> Shade will help before 5 PM. Wind stays comfortable through sunset.</p>
            </div>
          </div>

          <div className="plannerCard" id="planner">
            <p className="stepLabel">Plan something</p><h2>What are we doing?</h2>
            <div className="activityGrid" role="group" aria-label="Choose an activity">
              {activities.map(([value, icon, label]) => (
                <button key={value} className={`activity ${activity === value ? "active" : ""}`} onClick={() => setActivity(value)} type="button"><span>{icon}</span>{label}</button>
              ))}
            </div>
            <label className="fieldLabel" htmlFor="location">Where?</label>
            <div className="inputShell"><span aria-hidden="true">⌖</span><input id="location" defaultValue="Stockton, California" autoComplete="off" /><button type="button" aria-label="Use current location">◎</button></div>
            <span className="fieldLabel">When?</span>
            <div className="dateRow">
              {dates.map(([day, number, label], index) => (
                <button key={day} className={`dateOption ${date === index ? "active" : ""}`} onClick={() => setDate(index)} type="button"><small>{day}</small><strong>{number}</strong><span>{label}</span></button>
              ))}
            </div>
            <button className="primaryCta" type="button" onClick={() => setShowResult(true)}>Check my plan <span>→</span></button>
            <p className="quietNote">No account needed to check the weather.</p>
          </div>
        </section>

        <section className="outlook" id="outlook">
          <div className="sectionHeading"><div><p className="eyebrow dark"><span /> The next few days</p><h2>Weather you can use.</h2></div><p>Not just numbers. Each day comes with a plain-language recommendation for your plans.</p></div>
          <div className="forecastGrid">
            {forecast.map(([label, day, icon, temp, lead, copy, style]) => (
              <article className={`forecastDay ${style}`} key={day}><div><small>{label}</small><h3>{day}</h3></div><span className="weatherIcon" aria-hidden="true">{icon}</span><strong>{temp}</strong><p><b>{lead}</b> {copy}</p></article>
            ))}
          </div>
        </section>

        <section className="how" id="how">
          <p className="eyebrow dark"><span /> One plan, everybody informed</p><h2>From “what if?” to “we’re ready.”</h2>
          <div className="steps">
            <article><span>01</span><h3>Tell us the plan</h3><p>Pick the activity, place and date. Checking a plan doesn’t require an account.</p></article>
            <article><span>02</span><h3>Get a real answer</h3><p>See the best time, the important risks and practical advice—not a wall of weather data.</p></article>
            <article><span>03</span><h3>Keep people together</h3><p>Create the event, invite your people and send updates if the weather changes.</p></article>
          </div>
        </section>
      </main>

      <footer><div className="brand"><span className="brandMark"><i /><i /><i /></span><span><strong>Family Weather</strong><small>Plans change. Families stay connected.</small></span></div><p><a href="mailto:contact@thefamilyweather.com">contact@thefamilyweather.com</a></p><p>Privacy · Terms · SMS consent</p></footer>

      {showResult && <div className="modal" role="dialog" aria-modal="true" aria-labelledby="result-title" onMouseDown={(event) => event.target === event.currentTarget && setShowResult(false)}><div className="modalCard"><button className="close" type="button" onClick={() => setShowResult(false)} aria-label="Close">×</button><p className="eyebrow dark"><span /> Your planning answer</p><h2 id="result-title">Your {activity} looks good.</h2><div className="resultAnswer"><span>BEST TIME</span><strong>4–7 PM</strong></div><p>Clear skies and manageable heat. Set up shade for the first hour and secure lightweight table coverings.</p><button className="primaryCta" type="button">Create this event <span>→</span></button></div></div>}
    </>
  );
}
