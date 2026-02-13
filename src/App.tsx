import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "./components/Card";
import ArticleView from "./components/ArticleView";

type Mode = "rabbithole" | "speedrun";

// 100 popular / recognizable topics
const POPULAR_TITLES: string[] = [
  "Earth","Moon","Sun","Solar System","Universe","Milky Way","Galaxy","Star","Planet","Mars",
  "Jupiter","Saturn","Venus","Mercury (planet)","Neptune","Uranus","Pluto","Black hole","Big Bang","Gravity",
  "Light","Time","Mathematics","Physics","Chemistry","Biology","DNA","Evolution","Human","Brain",
  "Heart","Cancer","COVID-19","Vaccine","Artificial intelligence","Machine learning","Computer","Internet","World Wide Web","Software",
  "Algorithm","Programming language","Python (programming language)","JavaScript","React (software)","Google","Apple Inc.","Microsoft","Amazon (company)","Tesla, Inc.",
  "Wikipedia","YouTube","Instagram","TikTok","Twitter","Reddit","Netflix","Spotify","Video game","Minecraft",
  "Fortnite","Chess","Football","Basketball","Olympic Games","FIFA World Cup","Formula One","Tennis","Boxing","Manga",
  "Anime","Star Wars","Marvel Cinematic Universe","Harry Potter","The Lord of the Rings","Game of Thrones","The Beatles","Michael Jackson","Taylor Swift","K-pop",
  "United States","Germany","France","United Kingdom","Italy","Spain","Russia","China","India","Japan",
  "Brazil","Canada","Australia","Africa","Europe","Asia","Antarctica","Berlin","Paris","New York City",
  "London","Rome","Tokyo","Los Angeles","Bitcoin","Cryptocurrency","Stock market","Economy","Inflation","Climate change",
];

const RABBITHOLE_DECK_BASE = [
  "Earth","Google","Adolf_Hitler","Belal_Muhammad","Seneca","Adin_Ross","KFC",
  "Call_of_Duty","Crime_and_Punishment","Goethe","Kenya","Harvard","Kai_Cenat",
];

function toSafeTitlePath(t: string) {
  return encodeURIComponent(t.replaceAll(" ", "_"));
}

function norm(s: string) {
  return s
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/[\\(\\)\\[\]\\{\\},.;:'"!?/\\|<>@#$%^&*+=~`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string) {
  const stop = new Set(["the","of","and","in","to","a","an","for","on","at","by","with"]);
  return norm(s).split(" ").filter(w => w.length >= 2 && !stop.has(w));
}

// only used for speedrun ordering (NOT Rabbithole)
function scoreToTarget(candidate: string, target: string) {
  const c = norm(candidate);
  const t = norm(target);
  if (!c || !t) return 0;
  if (c === t) return 999;

  const cT = tokenize(candidate);
  const tT = tokenize(target);
  const tSet = new Set(tT);

  let score = 0;
  for (const w of cT) if (tSet.has(w)) score += 10;
  if (c.includes(t)) score += 45;
  for (const w of tT) if (c.includes(w)) score += 2;
  score -= Math.max(0, cT.length - 5);
  return score;
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandomStartTarget() {
  const a = POPULAR_TITLES[Math.floor(Math.random() * POPULAR_TITLES.length)];
  let b = POPULAR_TITLES[Math.floor(Math.random() * POPULAR_TITLES.length)];
  while (b === a) b = POPULAR_TITLES[Math.floor(Math.random() * POPULAR_TITLES.length)];
  return { start: a, target: b };
}

export default function App() {
  // ----------------- Shared UI -----------------
  const [mode, setMode] = useState<Mode>("rabbithole");
  const [displayTitle, setDisplayTitle] = useState("");
  const [html, setHTML] = useState("");

  // Step counter (counts both left and right in both modes)
  const [steps, setSteps] = useState(0);

  // ----------------- Rabbithole -----------------
  const [deck, setDeck] = useState<string[]>([...RABBITHOLE_DECK_BASE]);
  const [title, setTitle] = useState<string>(deck[0]);
  const [swipedRight, setSwipedRight] = useState(false);

  // from ArticleView: a “direct” next link (used for right swipe)
  const [firstLinkTitle, setFirstLinkTitle] = useState<string | null>(null);

  // pool from liked source page (used for left swipe after at least one right swipe)
  const [likedSourceTitle, setLikedSourceTitle] = useState<string | null>(null);
  const [likedLinkPool, setLikedLinkPool] = useState<string[]>([]);

  // ----------------- Speedrun -----------------
  const initialPair = useMemo(() => pickRandomStartTarget(), []);
  const [startTitle, setStartTitle] = useState(initialPair.start);
  const [targetTitle, setTargetTitle] = useState(initialPair.target);
  const [currentTitle, setCurrentTitle] = useState(initialPair.start);

  const [skips, setSkips] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const [candidates, setCandidates] = useState<string[]>([]);
  const [candidatePos, setCandidatePos] = useState(0);

  // critical: prevents auto-jump
  // "current" = show currentTitle page
  // "candidate" = preview a candidate page
  const [speedrunView, setSpeedrunView] = useState<"current" | "candidate">("current");

  const [finished, setFinished] = useState(false);
  const [finishSeconds, setFinishSeconds] = useState<number | null>(null);

  // timer tick for UI
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  // Compute what should be displayed in the card
  useEffect(() => {
    if (mode === "speedrun") {
      const cand = candidates[candidatePos];
      const show = speedrunView === "candidate" && cand ? cand : currentTitle;
      setDisplayTitle(show);
    } else {
      setDisplayTitle(title);
    }
  }, [mode, title, currentTitle, candidates, candidatePos, speedrunView]);

  // Fetch HTML for displayTitle
  useEffect(() => {
    let cancelled = false;
    if (!displayTitle) return;

    setHTML("");

    const safeTitle = toSafeTitlePath(displayTitle);
    fetch(`https://en.wikipedia.org/w/rest.php/v1/page/${safeTitle}/html`)
      .then((response) => {
        if (response.status >= 400) throw new Error("server error " + response.status);
        return response.text();
      })
      .then((response) => {
        if (!cancelled) setHTML(response);
      })
      .catch((error) => {
        console.log(error);
        if (cancelled) return;

        // show failure message but NEVER trap user
        setHTML("<p><b>Failed to load this article.</b> Picking another…</p>");

        // if speedrun candidate failed, auto-advance to another candidate
        if (mode === "speedrun" && candidates.length > 0 && speedrunView === "candidate") {
          setCandidatePos((p) => (p + 1) % candidates.length);
        }

        // if rabbithole link failed, just clear firstLinkTitle so user can swipe again
        if (mode === "rabbithole") {
          setFirstLinkTitle(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [displayTitle, mode, candidates.length, speedrunView]);

  // Fetch outgoing links for speedrun currentTitle (Action API)
  useEffect(() => {
    if (mode !== "speedrun") return;
    if (finished) return;

    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");
    url.searchParams.set("prop", "links");
    url.searchParams.set("titles", currentTitle);
    url.searchParams.set("plnamespace", "0");
    url.searchParams.set("pllimit", "max");
    url.searchParams.set("redirects", "1");

    fetch(url.toString())
      .then((response) => response.json())
      .then((response: unknown) => {
        const pagesObj = (
          (response as { query?: { pages?: Record<string, { links?: Array<{ title?: unknown }> }> } })
            .query?.pages ?? {}
        );
        const page = Object.values(pagesObj)[0];
        const links = Array.isArray(page?.links) ? page.links : [];
        const titles: string[] = links
          .map((l) => (typeof l.title === "string" ? l.title : null))
          .filter((t): t is string => t !== null);

        // filters
        const filtered = titles.filter((t) =>
          t &&
          t !== currentTitle &&
          !t.includes(":") &&
          !/^\d+\s/.test(t) &&
          !t.startsWith("List of ")
        );

        // rank by target similarity (but add randomness to avoid "always swipe right only")
        const scored = filtered
          .map((t) => ({ t, s: scoreToTarget(t, targetTitle) }))
          .sort((a, b) => b.s - a.s);

        const top: string[] = shuffle(scored.slice(0, 40).map((x) => x.t));
        const rest: string[] = shuffle(scored.slice(40).map((x) => x.t)).slice(0, 40);

        const mixed: string[] = [...top, ...rest];

        setCandidates(mixed);

        // random starting candidate near front; does NOT change view -> no auto-jump
        const pos = mixed.length === 0 ? 0 : Math.floor(Math.random() * Math.min(12, mixed.length));
        setCandidatePos(pos);
      })
      .catch((error) => console.log(error));
  }, [mode, currentTitle, targetTitle, finished]);

  // Start / restart speedrun (random pair)
  function startNewSpeedrunRun() {
    const pair = pickRandomStartTarget();
    setStartTitle(pair.start);
    setTargetTitle(pair.target);
    setCurrentTitle(pair.start);

    setSteps(0);
    setSkips(0);

    setCandidates([]);
    setCandidatePos(0);

    setSpeedrunView("current");

    setFinished(false);
    setFinishSeconds(null);

    setStartedAt(performance.now());
  }

  // when entering speedrun mode, start a new run
  useEffect(() => {
    if (mode === "speedrun") {
      startNewSpeedrunRun();
    } else {
      // leaving speedrun clears overlay
      setFinished(false);
      setFinishSeconds(null);
      setSpeedrunView("current");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ----------------- Swipe Handlers -----------------
  function handleSwipeLeft() {
    setSteps((s) => s + 1);

    if (mode === "speedrun") {
      if (finished) return;
      setSkips((k) => k + 1);

      // left = cycle candidates (preview mode)
      if (candidates.length > 0) {
        setSpeedrunView("candidate");
        setCandidatePos((p) => (p + 1) % candidates.length);
      }
      return;
    }

    // Rabbithole:
    // If user has swiped right at least once, left gives another RANDOM link from the liked source pool
    if (swipedRight && likedLinkPool.length > 0) {
      const r = Math.floor(Math.random() * likedLinkPool.length);
      const next = likedLinkPool[r];
      setTitle(next);

      // non-mutating removal
      setLikedLinkPool((prev) => prev.filter((_, idx) => idx !== r));
      return;
    }

    // Otherwise: normal deck skip
    setDeck((prev) => {
      let next = prev;
      if (next.length < 5) next = next.concat(RABBITHOLE_DECK_BASE);
      return next.slice(1);
    });

    setTitle((prevTitle) => {
      const idx = deck.indexOf(prevTitle);
      return deck[idx + 1] ?? deck[1] ?? prevTitle;
    });

    // reset "liked" state on pure skip
    setSwipedRight(false);
    setLikedSourceTitle(null);
    setLikedLinkPool([]);
  }

  function handleSwipeRight() {
    setSteps((s) => s + 1);

    if (mode === "speedrun") {
      if (finished) return;

      const chosen = candidates[candidatePos];
      if (!chosen) return;

      // accept chosen: move to it and show the CURRENT page (no auto-jump)
      setCurrentTitle(chosen);
      setSpeedrunView("current");

      // finish immediately if chosen is target
      if (norm(chosen) === norm(targetTitle)) {
        setFinished(true);
        if (startedAt != null) setFinishSeconds((performance.now() - startedAt) / 1000);
      }
      return;
    }

    // Rabbithole: right swipe should redirect immediately (like your original)
    if (!swipedRight) {
      setSwipedRight(true);
      setLikedSourceTitle(title);
      setLikedLinkPool([]); // will be filled by ArticleView from the liked source page
    }

    if (firstLinkTitle) {
      setTitle(firstLinkTitle);
      return;
    }

    // fallback if firstLinkTitle missing
    if (likedLinkPool.length > 0) {
      const r = Math.floor(Math.random() * likedLinkPool.length);
      setTitle(likedLinkPool[r]);
      setLikedLinkPool((prev) => prev.filter((_, idx) => idx !== r));
    }
  }

  const timeText =
    mode !== "rabbithole"
      ? (finishSeconds != null
          ? finishSeconds.toFixed(1)
          : startedAt
            ? ((performance.now() - startedAt) / 1000).toFixed(1)
            : "0.0")
      : null;

  const handleArticleEligibleLinks = useCallback((titles: string[]) => {
    // only accept pool if we're on the liked source page and it's empty (prevents overwriting)
    if (mode !== "rabbithole") return;
    if (!likedSourceTitle) return;
    if (displayTitle !== likedSourceTitle) return;
    if (likedLinkPool.length === 0) setLikedLinkPool(titles);
  }, [mode, likedSourceTitle, displayTitle, likedLinkPool.length]);

  const handleArticleLinkClick = useCallback((t: string) => {
    console.log("User clicked link to:", t);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "grid",
        placeItems: "center",
        background: "#111",
        padding: 16,
      }}
    >
      {/* keep your old top UI */}
      <div style={{ padding: 10, alignContent: "center" }}>
        {mode !== "rabbithole" && (
          <p
            style={{
              background: "white",
              display: "inline-block",
              marginRight: 50,
              paddingRight: 20,
              paddingLeft: 20,
              paddingTop: 10,
              paddingBottom: 10,
              borderRadius: 15,
            }}
          >
            Start: {startTitle}
          </p>
        )}
        <button
          style={{ padding: 10, marginRight: 5, color: "white", background: "red" }}
          onClick={() => setMode("rabbithole")}
        >
          Rabbit Hole Mode
        </button>
        <button
          style={{ padding: 10, marginLeft: 5, color: "white", background: "green" }}
          onClick={() => setMode("speedrun")}
        >
          Speedrun Mode
        </button>
        {mode !== "rabbithole" && (
          <p
            style={{
              background: "white",
              display: "inline-block",
              marginLeft: 50,
              paddingRight: 20,
              paddingLeft: 20,
              paddingTop: 10,
              paddingBottom: 10,
              borderRadius: 15,
            }}
          >
            Target: {targetTitle}
          </p>
        )}
        {mode !== "rabbithole" && (
          <p
            style={{
              background: "white",
              display: "inline-block",
              marginLeft: 50,
              paddingRight: 20,
              paddingLeft: 20,
              paddingTop: 10,
              paddingBottom: 10,
              borderRadius: 15,
            }}
          >
            {timeText}
          </p>
        )}
      </div>

      <div style={{ marginBottom: 5 }}>
        <p
          style={{
            background: "white",
            padding: 10,
            fontSize: 15,
            borderRadius: 25,
            display: "inline-block",
          }}
        >
          Current Mode: {mode}
        </p>
        <p
          style={{
            background: "blue",
            padding: 10,
            borderRadius: 25,
            color: "white",
            display: "inline-block",
            marginLeft: 50,
          }}
        >
          Steps: {steps}
        </p>
      </div>

      <Card
        title={displayTitle}
        setTitle={setTitle}
        firstLinkTitle={firstLinkTitle}
        onLeftSwipe={handleSwipeLeft}
        onRightSwipe={handleSwipeRight}
        mode={mode}
        isLocked={mode === "speedrun" && finished}
      >
        {html === "" ? (
          "Loading article..."
        ) : (
          <ArticleView
            html={html}
            onLinkClick={handleArticleLinkClick}
            currentTitle={displayTitle}
            swipedRight={swipedRight}
            mode={mode}
            poolSourceTitle={likedSourceTitle}
            onEligibleLinks={handleArticleEligibleLinks}
            onFirstEligibleLink={setFirstLinkTitle}
          />
        )}
      </Card>

      {/* finish overlay */}
      {mode === "speedrun" && finished && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(420px, 92vw)",
              background: "white",
              borderRadius: 18,
              padding: 16,
              textAlign: "center",
            }}
          >
            <h2 style={{ margin: "6px 0 10px 0" }}>Finished!</h2>
            <p style={{ margin: "6px 0" }}>
              You reached <b>{targetTitle}</b>.
            </p>
            <p style={{ margin: "6px 0" }}>
              Time: <b>{finishSeconds != null ? finishSeconds.toFixed(2) : "—"}</b>s
            </p>
            <p style={{ margin: "6px 0" }}>
              Total Steps: <b>{steps}</b>
            </p>
            <p style={{ margin: "6px 0" }}>
              Right Swipes: <b>{steps-skips}</b> · Left Swipes: <b>{skips}</b>
            </p>
            <button
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 10,
                border: 0,
                background: "green",
                color: "white",
              }}
              onClick={startNewSpeedrunRun}
            >
              Restart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
