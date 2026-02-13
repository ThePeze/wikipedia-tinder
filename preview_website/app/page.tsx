'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './page.module.css'

interface WikipediaArticle {
  title: string
  content: string
}

const RIGHT_SWIPE_ARTICLES = [
  'Adolf Hitler',
  'Nazi Germany',
  'Holocaust',
  'World War II',
  'Antisemitism',
  'Zionism',
  'Palestine (region)',
  'State of Palestine',
  'Israel',
]

const LEFT_SWIPE_ARTICLES = [
  'Epstein',
  'Jeffrey Epstein',
  'Ghislaine Maxwell',
  'Sex trafficking',
]

export default function Home() {
  const [article, setArticle] = useState<WikipediaArticle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [articlePath, setArticlePath] = useState<string[]>(['Kanye West'])
  const [pathIndex, setPathIndex] = useState(0)
  const [showTimer, setShowTimer] = useState(false)
  const [timer, setTimer] = useState(0)
  const [startingArticle, setStartingArticle] = useState('Kanye West')
  const [targetArticle] = useState('Israel')
  const [isAnimating, setIsAnimating] = useState(false)
  
  const cardRef = useRef<HTMLDivElement>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const dragStateRef = useRef({ startX: 0, currentOffset: 0, isDragging: false })

  const fetchWikipediaArticle = useCallback(async (title: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch article')
      }
      const html = await response.text()
      
      // Parse HTML and remove unwanted sections
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      
      // Remove "Not to be confused with" and similar disambiguation sections
      const disambiguationSelectors = [
        '.hatnote',
        '.dablink',
        '.rellink',
        '.mw-disambig',
      ]
      disambiguationSelectors.forEach(selector => {
        const elements = doc.querySelectorAll(selector)
        elements.forEach(el => el.remove())
      })
      
      // Get the main content
      const body = doc.body
      const content = body.innerHTML
      
      setArticle({ title, content })
    } catch (error) {
      console.error('Error fetching article:', error)
      // Fallback: try to fetch as plain text
      try {
        const response = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
        )
        if (response.ok) {
          const data = await response.json()
          setArticle({
            title: data.title,
            content: `<div><h1>${data.title}</h1><p>${data.extract}</p></div>`,
          })
        }
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWikipediaArticle('Kanye West')
  }, [fetchWikipediaArticle])

  const updateCardTransform = useCallback((offset: number) => {
    if (!cardRef.current) return
    const rotation = (offset / 180) * 20
    const normalizedOffset = Math.abs(offset) / 180
    const borderOpacity = Math.min(Math.pow(normalizedOffset, 0.7), 1)
    const borderColor = offset > 0 
      ? `rgba(34, 197, 94, ${borderOpacity})` 
      : offset < 0
      ? `rgba(239, 68, 68, ${borderOpacity})`
      : `rgba(0, 0, 0, 0)`
    
    cardRef.current.style.transform = `translateX(${offset}px) rotate(${rotation}deg)`
    cardRef.current.style.borderColor = borderColor
    dragStateRef.current.currentOffset = offset
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isAnimating) return
    e.preventDefault()
    dragStateRef.current.startX = e.clientX
    dragStateRef.current.isDragging = true
    setIsDragging(true)
    
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (!dragStateRef.current.isDragging || !cardRef.current) return
      const deltaX = e.clientX - dragStateRef.current.startX
      const clampedDelta = Math.max(-180, Math.min(180, deltaX))
      updateCardTransform(clampedDelta)
    }
    
    const handleMouseUpGlobal = () => {
      if (!dragStateRef.current.isDragging) return
      const currentOffset = dragStateRef.current.currentOffset
      dragStateRef.current.isDragging = false
      setIsDragging(false)
      
      const threshold = 100
      if (Math.abs(currentOffset) > threshold) {
        handleSwipe(currentOffset > 0 ? 'right' : 'left')
      } else {
        animateToCenter()
      }
      
      document.removeEventListener('mousemove', handleMouseMoveGlobal)
      document.removeEventListener('mouseup', handleMouseUpGlobal)
    }
    
    document.addEventListener('mousemove', handleMouseMoveGlobal)
    document.addEventListener('mouseup', handleMouseUpGlobal)
  }, [isAnimating, updateCardTransform])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimating) return
    e.preventDefault()
    dragStateRef.current.startX = e.touches[0].clientX
    dragStateRef.current.isDragging = true
    setIsDragging(true)
    
    const handleTouchMoveGlobal = (e: TouchEvent) => {
      if (!dragStateRef.current.isDragging || !cardRef.current || e.touches.length === 0) return
      const deltaX = e.touches[0].clientX - dragStateRef.current.startX
      const clampedDelta = Math.max(-180, Math.min(180, deltaX))
      updateCardTransform(clampedDelta)
    }
    
    const handleTouchEndGlobal = () => {
      if (!dragStateRef.current.isDragging) return
      const currentOffset = dragStateRef.current.currentOffset
      dragStateRef.current.isDragging = false
      setIsDragging(false)
      
      const threshold = 100
      if (Math.abs(currentOffset) > threshold) {
        handleSwipe(currentOffset > 0 ? 'right' : 'left')
      } else {
        animateToCenter()
      }
      
      document.removeEventListener('touchmove', handleTouchMoveGlobal)
      document.removeEventListener('touchend', handleTouchEndGlobal)
    }
    
    document.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false })
    document.addEventListener('touchend', handleTouchEndGlobal)
  }, [isAnimating, updateCardTransform])

  const animateToCenter = useCallback(() => {
    setIsAnimating(true)
    const startOffset = dragStateRef.current.currentOffset
    const startTime = performance.now()
    const duration = 150

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      
      const currentOffset = startOffset * (1 - ease)
      updateCardTransform(currentOffset)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        updateCardTransform(0)
        setIsAnimating(false)
      }
    }
    
    requestAnimationFrame(animate)
  }, [updateCardTransform])

  const animateSwipe = useCallback((direction: 'left' | 'right', callback: () => void) => {
    setIsAnimating(true)
    const targetOffset = direction === 'right' ? 400 : -400
    const startOffset = dragStateRef.current.currentOffset
    const startTime = performance.now()
    const duration = 150

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      
      const currentOffset = startOffset + (targetOffset - startOffset) * ease
      updateCardTransform(currentOffset)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        updateCardTransform(0)
        setIsAnimating(false)
        callback()
      }
    }
    
    requestAnimationFrame(animate)
  }, [updateCardTransform])

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    let nextArticle: string | null = null
    let newPathIndex = pathIndex
    const currentArticle = articlePath[pathIndex]
    
    if (direction === 'right') {
      // Swipe right path
      if (currentArticle === 'Kanye West') {
        // First swipe right: go to Adolf Hitler
        nextArticle = RIGHT_SWIPE_ARTICLES[0]
        const newPath = [...articlePath, nextArticle]
        newPathIndex = newPath.length - 1
        setArticlePath(newPath)
        setPathIndex(newPathIndex)
      } else {
        // Check if we can continue the right path
        const rightIndex = RIGHT_SWIPE_ARTICLES.indexOf(currentArticle)
        if (rightIndex >= 0 && rightIndex < RIGHT_SWIPE_ARTICLES.length - 1) {
          // Continue in right path sequence
          nextArticle = RIGHT_SWIPE_ARTICLES[rightIndex + 1]
          const newPath = [...articlePath, nextArticle]
          newPathIndex = newPath.length - 1
          setArticlePath(newPath)
          setPathIndex(newPathIndex)
        } else if (pathIndex < articlePath.length - 1) {
          // Go forward in existing path (only if not in a right path sequence)
          newPathIndex = pathIndex + 1
          nextArticle = articlePath[newPathIndex]
          setPathIndex(newPathIndex)
        } else {
          // End of path, stay on current article
          animateToCenter()
          return
        }
      }
    } else {
      // Swipe left path
      if (currentArticle === 'Kanye West') {
        // First swipe left: go to Diddy
        nextArticle = 'Diddy'
        const newPath = [...articlePath, nextArticle]
        newPathIndex = newPath.length - 1
        setArticlePath(newPath)
        setPathIndex(newPathIndex)
      } else if (currentArticle === 'Diddy') {
        // After Diddy, go to Epstein array
        nextArticle = LEFT_SWIPE_ARTICLES[0]
        const newPath = [...articlePath, nextArticle]
        newPathIndex = newPath.length - 1
        setArticlePath(newPath)
        setPathIndex(newPathIndex)
      } else {
        // Check if we can continue the left path
        const leftIndex = LEFT_SWIPE_ARTICLES.indexOf(currentArticle)
        if (leftIndex >= 0 && leftIndex < LEFT_SWIPE_ARTICLES.length - 1) {
          // Continue in left path sequence
          nextArticle = LEFT_SWIPE_ARTICLES[leftIndex + 1]
          const newPath = [...articlePath, nextArticle]
          newPathIndex = newPath.length - 1
          setArticlePath(newPath)
          setPathIndex(newPathIndex)
        } else if (pathIndex > 0) {
          // Go back in existing path (only if not in a left path sequence)
          newPathIndex = pathIndex - 1
          nextArticle = articlePath[newPathIndex]
          setPathIndex(newPathIndex)
        } else {
          // End of path, stay on current article
          animateToCenter()
          return
        }
      }
    }
    
    if (nextArticle) {
      animateSwipe(direction, () => {
        fetchWikipediaArticle(nextArticle!)
      })
    }
  }, [pathIndex, articlePath, animateSwipe, fetchWikipediaArticle])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimating || isDragging) return
      
      if (e.key === 'ArrowRight') {
        handleSwipe('right')
      } else if (e.key === 'ArrowLeft') {
        handleSwipe('left')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAnimating, isDragging, handleSwipe])

  const handleTimerButtonClick = () => {
    if (showTimer) {
      // Stop timer
      setShowTimer(false)
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      startTimeRef.current = null
      setTimer(0)
    } else {
      // Start timer
      setShowTimer(true)
      startTimeRef.current = Date.now()
      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = (Date.now() - startTimeRef.current) / 1000
          setTimer(elapsed)
        }
      }, 100)
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.contentWrapper}>
        {showTimer && (
          <div className={styles.timerContainer}>
            <div className={styles.articleBadge}>
              <span className={styles.badgeLabel}>Starting Article:</span>
              <span className={styles.badgeValue}>{startingArticle}</span>
            </div>
            <div className={styles.timer}>{timer.toFixed(1)}s</div>
            <div className={styles.articleBadge}>
              <span className={styles.badgeLabel}>Target Article:</span>
              <span className={styles.badgeValue}>{targetArticle}</span>
            </div>
          </div>
        )}
        
        <div
          ref={cardRef}
          className={styles.card}
          style={{
            borderWidth: '4px',
            borderStyle: 'solid',
            willChange: isDragging ? 'transform' : 'auto',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {isLoading ? (
            <div className={styles.loading}>Loading article...</div>
          ) : article ? (
            <div
              className={styles.articleContent}
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          ) : (
            <div className={styles.error}>Failed to load article</div>
          )}
        </div>
      </div>

      <button
        className={styles.timerButton}
        onClick={handleTimerButtonClick}
        aria-label="Toggle timer"
      >
        ⏱️
      </button>
    </main>
  )
}

