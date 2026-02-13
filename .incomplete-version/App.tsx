import { use, useEffect, useState } from 'react';
import Card from './components/Card';
import ArticleView from './components/ArticleView';
export default function App(){
  const [deck, setDeck] = useState(["Earth", "Google", "Adolf_Hitler", "Belal_Muhammad", "Seneca", "Adin_Ross", "KFC"]) 
  const [title, setTitle] = useState(deck[0])
  //const [articleContent, setContent] = useState("")
  const [html, setHTML] = useState("")
  //const [loading, setLoading] = useState(true)
  const [firstLinkTitle, setFirstLinkTitle] = useState<string | null>(null)
  //const [linkSourceTitle, setLinkSourceTitle] = useState<string | null>(null)
  const [likedLinkPool, setLikedLinkPool] = useState<string[]>([])
  const [swipedRight, setSwipedRight] = useState(false)
  const [swipedLeft, setSwipedLeft] = useState(false)

  const [mode, setMode] = useState<"rabbithole" | "speedrun">("rabbithole")

  const [displayTitle, setDisplayTitle] = useState("")

  //-------------------speedrun variables-----------------------
  const [startTitle, setStartTitle] = useState("Earth")
  const [targetTitle, setTargetTitle] = useState("Moon")
  const [currentTitle, setCurrentTitle] = useState(startTitle)
  const [steps, setSteps] = useState(0)
  const [skips, setSkips] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(0)
  const [candidates, setCandidates] = useState([])
  const [candidatePos, setCandidatePos] = useState(0)
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if(mode === "speedrun"){
      setDisplayTitle(currentTitle)
    } 
    else{
      setDisplayTitle(title)
    }
  }, [mode, title, currentTitle, startTitle])

  useEffect(() => {
    let cancelled = false;
    //setLoading(true);
    if(!cancelled){
      setHTML("")
    }
    const safeTitle = encodeURIComponent(displayTitle)
    fetch(`https://en.wikipedia.org/w/rest.php/v1/page/${safeTitle}/html`)
      .then((response) => {
        if (response.status >= 400) {
          throw new Error("server error " + response.status);
        }
        return response.text();
      })
      .then((response) => {
        if(!cancelled){
          setHTML(response)
        }
      })
      .catch((error) => console.log(error))
      /*.finally(() => {
        if(!cancelled){
          setLoading(false)
        }
      })*/  
    return () => {cancelled = true;};  
      
  }, [displayTitle, swipedRight])

  useEffect(() => {
    if(mode != 'speedrun') return;
    const url = new URL("https://en.wikipedia.org/w/api.php")
    url.searchParams.set("action", "query")
    url.searchParams.set("format", "json")
    url.searchParams.set("origin", "*")
    url.searchParams.set("prop", "links")
    url.searchParams.set("titles", currentTitle)
    url.searchParams.set("plnamespace", "0")
    url.searchParams.set("pllimit", "max")
    url.searchParams.set("redirects", "1")

    console.log(url.toString())

    fetch(url.toString())
      .then((response) => {
        if (response.status >= 400) {
          throw new Error("server error " + response.status);
        }
        return response.json();
      })
      .then((response) => {
        const pagesObj = response.query.pages;
        const pagesArr = Object.values(pagesObj);
        const page = pagesArr[0];
        const links = page.links ?? [];
        const titles  = links.map((l: any) => l.title)
        const filteredTitles = titles.filter((t: string) => 
          t !== currentTitle &&
          !t.includes(":") &&
          !/^\d+\s/.test(t)
        )
        console.log(filteredTitles.slice(0, 10))
        setCandidates(filteredTitles)
        const randomNum = Math.floor(Math.random() * (filteredTitles.length));
        setCandidatePos(randomNum)
      })
  }, [mode, currentTitle])

  useEffect(() => {
    console.log("Current Candidate: " + candidates[candidatePos])
    if(mode === "speedrun" && candidates.length > 0 && swipedLeft == true){
      setCurrentTitle(candidates[candidatePos])
      setSwipedLeft(false)
    }
  }, [candidates, candidatePos, mode, swipedLeft])

  useEffect(() => {
    if(mode == 'speedrun'){
      setCurrentTitle(startTitle)
      setStartedAt(performance.now())
    }
  }, [mode, startTitle])

  //timer
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [])

  function handleLinkClick(title: string) {
    console.log("User clicked link to: ", title)
  }

  function handleSwipeLeft(){
    if(mode === 'speedrun'){
      setSwipedLeft(true)
      setSteps(steps+1)
      setSkips(skips+1)
      if(!(candidatePos + 1 >= candidates.length)){
        setCandidatePos(candidatePos+1) 
      }
      else if(candidatePos + 1 >= candidates.length) setCandidatePos(0);
    }
    
    if(mode === 'rabbithole'){
      if(likedLinkPool.length != 0 && swipedRight){
        const randomNum = Math.floor(Math.random() * (likedLinkPool.length));
        console.log("Randomly picked link: " + likedLinkPool[randomNum])
        setSteps(steps+1)
        setTitle(likedLinkPool[randomNum])
        setLikedLinkPool(prev => prev.splice(randomNum, 1))
        console.log(likedLinkPool);
      } 
      else{
        if(deck.length < 5){
          deck.push("Call_of_Duty", "Crime_and_Punishment", "Goethe", "Kenya", "Harvard", "Kai_Cenat")
        }
        setDeck(prev => prev.slice(1))
        setTitle(deck[0])
        setSwipedRight(false)
      }
    }
    
  }

  function handleSwipeRight(){
    if(!swipedRight) setSwipedRight(true);
    if(mode === 'speedrun'){
      setSteps(steps+1)
      const chosen = candidates[candidatePos]
      setCurrentTitle(chosen)
      console.log("Current Title: " + currentTitle)
      setCandidatePos(0)
      if(currentTitle == targetTitle){
        //stop timer
        if(startedAt != null){
          const elapsed = performance.now() - startedAt
        }
        //################# Show FINISH overlay ##############################
        ///########### disable swipes until restart ###########################
      }
    }
    else if (mode === 'rabbithole'){
      setSteps(steps+1)
    }
  }

  return(
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      display: "grid",
      placeItems: "center",
      background: "#111",
      padding: 16,
    }}>
      <div style={{
        padding: 10,
        alignContent: 'center',
      }}>
        {mode !== "rabbithole" && (
          <p style={{background: 'white', display: 'inline-block', marginRight: 50, paddingRight: 20, paddingLeft: 20, paddingTop: 10, paddingBottom: 10, borderRadius: 15,}}>Start: {startTitle}</p>
        )}
        <button style={{padding:10, marginRight: 5, color: 'white', background: 'red'}} onClick={() => {setMode('rabbithole')}}>Rabbit Hole Mode</button>
        <button style={{padding:10, marginLeft: 5, color: 'white', background: 'green'}} onClick={() => {setMode('speedrun')}}>Speedrun Mode</button>
        {mode !== "rabbithole" && (
          <p style={{background: 'white', display: 'inline-block', marginLeft: 50, paddingRight: 20, paddingLeft: 20, paddingTop: 10, paddingBottom: 10, borderRadius: 15}}>Target: {targetTitle}</p>
        )}
        {mode !== "rabbithole" && (
          <p style={{background: 'white', display: 'inline-block', marginLeft: 50, paddingRight: 20, paddingLeft: 20, paddingTop: 10, paddingBottom: 10, borderRadius: 15}}> {((performance.now() - startedAt)/1000).toFixed(1)}</p>
        )}
        
        
      </div>
      <div style={{marginBottom: 5}}>
        <p style={{background: 'white', padding: 10, fontSize: 15, borderRadius: 25, display: 'inline-block'}}>Current Mode: {mode}</p>
        <p style={{background: 'blue', padding: 10, borderRadius: 25, color: 'white', display: 'inline-block', marginLeft: 50 }}>Steps: {steps}</p>
      </div>
      <Card title={displayTitle} firstLinkTitle={firstLinkTitle} setTitle={setTitle} onLeftSwipe={handleSwipeLeft} onRightSwipe={handleSwipeRight} mode={mode}>
        {html === ""? "Loading article..." : <ArticleView html={html} onLinkClick={handleLinkClick} onFirstEligibleLink={setFirstLinkTitle} onEligibleLinks={setLikedLinkPool} currentTitle={displayTitle} swipedRight={swipedRight}/>}
      </Card>
    </div>
  );
}