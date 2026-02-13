import DOMPurify from "dompurify";
import "./ArticleView.css";
import { useEffect, useMemo, useRef } from "react";

type ArticleViewProps = {
  html: string;
  onLinkClick: (title: string) => void;

  onFirstEligibleLink?: (title: string | null) => void;
  onEligibleLinks?: (titles: string[]) => void;

  currentTitle: string;
  swipedRight: boolean;

  mode: "rabbithole" | "speedrun";

  // Only fill pool from this page (prevents “pool from wrong page” bug)
  poolSourceTitle: string | null;
};

function normalizeHrefToTitle(rawHref: string) {
  let t = rawHref;
  if (t.startsWith("/wiki/")) t = t.slice("/wiki/".length);
  else if (t.startsWith("./")) t = t.slice(2);
  else return null;

  t = t.split(/[?#]/)[0];
  try {
    t = decodeURIComponent(t);
  } catch { /* empty */ }
  if (!t || t.includes(":")) return null;
  return t;
}

export default function ArticleView({
  html,
  onLinkClick,
  onFirstEligibleLink,
  onEligibleLinks,
  currentTitle,
  swipedRight,
  mode,
  poolSourceTitle,
}: ArticleViewProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onFirstEligibleLinkRef = useRef<typeof onFirstEligibleLink>(onFirstEligibleLink);
  const onEligibleLinksRef = useRef<typeof onEligibleLinks>(onEligibleLinks);

  useEffect(() => {
    onFirstEligibleLinkRef.current = onFirstEligibleLink;
  }, [onFirstEligibleLink]);

  useEffect(() => {
    onEligibleLinksRef.current = onEligibleLinks;
  }, [onEligibleLinks]);

  const safeHtml = useMemo(() => DOMPurify.sanitize(html), [html]);

  const cleanHtml = useMemo(() => {
    if (safeHtml === "") return "";
    const doc = new DOMParser().parseFromString(safeHtml, "text/html");
    const root = doc.body;

    // remove annoying banners
    root.querySelectorAll(".hatnote, .dablink, .rellink, .ambox").forEach((n) => n.remove());

    // remove big bottom sections
    const kill = ["see also","references","sources","external links","notes","bibliography","further reading"];
    const h2s = Array.from(root.querySelectorAll("h2"));
    for (const h2 of h2s) {
      const text = (h2.textContent ?? "").toLowerCase();
      if (kill.some((k) => text.includes(k))) {
        let node = h2.nextElementSibling;
        h2.remove();
        while (node && node.tagName !== "H2") {
          const next = node.nextElementSibling;
          node.remove();
          node = next;
        }
      }
    }

    // Speedrun: only top of article for speed (first ~3 paragraphs)
    if (mode === "speedrun") {
      const keep: Element[] = [];
      const h1 = root.querySelector("h1");
      if (h1) keep.push(h1);
      const paras = Array.from(root.querySelectorAll("p")).slice(0, 3);
      for (const p of paras) keep.push(p);

      root.innerHTML = "";
      for (const el of keep) root.appendChild(el.cloneNode(true));
    }

    return root.innerHTML;
  }, [safeHtml, mode]);

  // link scanning for Rabbithole (firstLinkTitle + pool)
  useEffect(() => {
    if (!ref.current) return;

    const anchors = Array.from(ref.current.querySelectorAll("a"));
    const candidates: string[] = [];

    for (const a of anchors) {
      const rawHref = a.getAttribute("href");
      if (!rawHref) continue;
      if (rawHref.startsWith("#")) continue;
      if (!rawHref.startsWith("/wiki/") && !rawHref.startsWith("./")) continue;
      if (a.closest(".hatnote, .dablink, .rellink, .infobox")) continue;

      const t = normalizeHrefToTitle(rawHref);
      if (!t) continue;
      if (t === currentTitle) continue;

      candidates.push(t);
    }

    const dedup = Array.from(new Set(candidates));

    // Always provide a direct "right swipe" link (random)
    if (onFirstEligibleLinkRef.current) {
      if (dedup.length === 0) onFirstEligibleLinkRef.current(null);
      else onFirstEligibleLinkRef.current(dedup[Math.floor(Math.random() * dedup.length)]);
    }

    // Only fill the pool from the liked source page in Rabbithole
    if (
      mode === "rabbithole" &&
      swipedRight &&
      poolSourceTitle &&
      poolSourceTitle === currentTitle &&
      onEligibleLinksRef.current
    ) {
      onEligibleLinksRef.current(dedup);
    }
  }, [cleanHtml, currentTitle, swipedRight, poolSourceTitle, mode]);

  return (
    <div
      ref={ref}
      className="article"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest("a");
        if (!(anchor instanceof HTMLAnchorElement)) return;
        e.preventDefault();

        const rawHref = anchor.getAttribute("href");
        if (!rawHref) return;

        const t = normalizeHrefToTitle(rawHref);
        if (!t) return;

        onLinkClick(t.replaceAll("_", " "));
      }}
    />
  );
}
