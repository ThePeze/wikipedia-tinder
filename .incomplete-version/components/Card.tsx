import { useRef, useState, type ReactNode } from "react";

type CardProps = {
    title: string;
    setTitle: React.Dispatch<React.SetStateAction<string>>
    firstLinkTitle: string | null;
    children?: ReactNode;
    onLeftSwipe: (deck: string) => void;
    onRightSwipe: (swipeRight: boolean) => void;
    mode: "rabbithole" | "speedrun";
};

export default function Card({ title, setTitle, children, firstLinkTitle, onLeftSwipe, onRightSwipe, mode}: CardProps){
    const [horizontalOffset, setHorizontalOffset] = useState(0)
    const [verticalOffset, setVerticalOffset] = useState(0)
    const [rotationOffset, setRotationOffset] = useState(0)
    
    const [isDragging, setIsDragging] = useState(false)

    const startX = useRef(0)
    const startY = useRef(0)

    title = title.replaceAll("_", " ")

    return(
        <div style={{
            width: "min(420px, 92vw)",
            aspectRatio: "9 / 16",
            background: "white",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
            transform: `translateX(${horizontalOffset}px) translateY(${verticalOffset}px) rotate(${rotationOffset}deg)`,
            transition: isDragging ? "none" : "transform 200ms ease",
        }}>
            <div style={{
                padding: 12,
                borderBottom: "1px solid #eee",
                fontWeight: 600,
            }} 
                onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId); 
                    setIsDragging(true);
                    startX.current = e.clientX;
                    startY.current = e.clientY;
                    setHorizontalOffset(0);
                    setVerticalOffset(0);
                    setRotationOffset(0);
                }}
                onPointerMove={(e) => {
                    if(isDragging){
                        const dx = e.clientX - startX.current;
                        const dy = e.clientY - startY.current;
                        setHorizontalOffset(dx);
                        setVerticalOffset(dy * 0.1);
                        setRotationOffset(Math.min(12, Math.max(-12, dx / 25)));
                    }
                }}
                onPointerUp={(e) => {
                    setIsDragging(false);
                    const dx = e.clientX - startX.current;
                    if(dx > 180){
                        //swipe right function
                        console.log("right");
                        console.log(firstLinkTitle);
                        if(mode === 'rabbithole'){
                            if(firstLinkTitle){
                                setTitle(firstLinkTitle);
                            } 
                        }
                        
                        if(onRightSwipe){
                            onRightSwipe(true)
                        }
                        setHorizontalOffset(0);
                        setVerticalOffset(0);
                        setRotationOffset(0);
                    } else if(dx < -180){
                        //swipe left function
                        console.log("left");
                        onLeftSwipe("")
                        setHorizontalOffset(0);
                        setVerticalOffset(0);
                        setRotationOffset(0);
                    } else{
                        setHorizontalOffset(0);
                        setVerticalOffset(0);
                        setRotationOffset(0);
                    }
                }}
                //onPointerCancel={}
            >
                {title}
            </div>
            <div style={{
                padding: 12, 
                overflow: "auto",
            }}>
                <div style={{
                    lineHeight: 1.5,
                    fontSize: '0.95rem',
                }}>
                    {children}
                </div>
                
            </div>
        </div>
    );
}
