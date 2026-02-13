import DOMPurify from "dompurify";
import "./ArticleView.css";
import { useLayoutEffect, useMemo, useRef } from "react";

type ArticleViewProps = {
    html: string;
    onLinkClick: (title: string) => void;
    onFirstEligibleLink?: (title: string | null) => void;
    onEligibleLinks?: (titles: string[]) => void;
    currentTitle: string;
    swipedRight: boolean;
};

export default function ArticleView({html, onLinkClick, onFirstEligibleLink, onEligibleLinks, currentTitle, swipedRight} : ArticleViewProps){
    const refVariable = useRef<HTMLDivElement | null>(null)
    const safeHtml = useMemo(() => DOMPurify.sanitize(html), [html])
    const cleanHtml = useMemo(() => {
        if(safeHtml == "") return "";
        const doc = new DOMParser().parseFromString(safeHtml, "text/html")
        const root = doc.body;
        //var for all uselss boxes like "See also, ..." or "Not to be confused with..."
        const garbage = Array.from(root.querySelectorAll(".hatnote, .dablink, .rellink, .ambox"));
        for(const g of garbage){
            g.remove()
        } 

        //remove all useless sections(e.g. References, External Links, See also)
        const h2s = Array.from(root.querySelectorAll("h2"));
        for(const h2 of h2s){
            const text = (h2.textContent ?? "").toLowerCase();
            if(text.includes("see also") || text.includes("references") || text.includes("sources") || text.includes("external links") || text.includes("notes") || text.includes("bibliography") || text.includes("further reading")){
                let node = h2.nextElementSibling;
                h2.remove()
                while(node != null && node.tagName !== "H2"){
                    const next = node.nextElementSibling;
                    node.remove()
                    node = next;
                }
            }
        }
        return root.innerHTML;
    }, [safeHtml])

    useLayoutEffect(() => {
        if(!refVariable.current){
            return;
        }

        const canditates: string[] = []
        const anchors = refVariable.current?.querySelectorAll("a");
        if(anchors != null){
            for(let i = 0; i < anchors?.length; i++ ){
                let rawHref = anchors[i].getAttribute("href")
                if(rawHref == null){
                    continue;
                }
                else if(rawHref?.startsWith("#")) continue;
                else if(!rawHref?.startsWith("/wiki/") && !rawHref?.startsWith("./")) continue;
                if(anchors[i].closest(".hatnote, .dablink, .rellink, .infobox") != null) continue;
                if(rawHref?.includes("identifier")) continue;
                if(rawHref?.startsWith("/wiki/")){
                    rawHref = rawHref.replace("/wiki/", "")
                }
                else if(rawHref?.startsWith("./")){
                    rawHref = rawHref.replace("./", "")
                }
                rawHref = rawHref.split(/[?#]/)[0];
                rawHref = decodeURIComponent(rawHref);
                if(rawHref == currentTitle) continue;
                if(rawHref?.includes(":")){
                    continue;
                }
                if(rawHref == "") continue;
                else if(canditates){
                    canditates.push(rawHref);
                    continue;
                }
            }
            if(onEligibleLinks && canditates.length > 1 && swipedRight){
                onEligibleLinks(canditates)
            }

            if(canditates.length == 0 && onFirstEligibleLink){
                onFirstEligibleLink(null)
            }
            else if(onFirstEligibleLink){
                const randomNum = Math.floor(Math.random() * (canditates.length));
                console.log("Randomly picked link: " + canditates[randomNum])
                onFirstEligibleLink(canditates[randomNum])
            }
        }
        
    }, [html, onFirstEligibleLink, currentTitle, onEligibleLinks, swipedRight])
    return(
        <div 
            dangerouslySetInnerHTML={{__html: cleanHtml}}
            className="article"
            ref={refVariable}
            
            onClick={(e) => {
                const target = e.target as HTMLElement;
                const anchor = target.closest("a");
                if(anchor instanceof HTMLAnchorElement){
                    e.preventDefault();
                    const rawHref = anchor.getAttribute("href");
                    let titlePart = ""
                    if(rawHref?.startsWith("./")){
                        titlePart = rawHref.replace("./", "")
                    }
                    else{
                        return;
                    }
                    //remove anything after ? or #
                    titlePart = titlePart.split(/[?#]/)[0];
                    titlePart = decodeURIComponent(titlePart);
                    titlePart = titlePart.replaceAll("_", " ");
                    if(rawHref?.includes(":")){
                        return;
                    }
                    onLinkClick(decodeURIComponent(titlePart));
                }

            }}
        />
    );
}