// components/home/TypewriterWord.tsx
"use client";
import { useEffect, useState } from "react";

type TypewriterWordProps = { words: string[] };

export function TypewriterWord({ words }: TypewriterWordProps) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[index];
    let timer: ReturnType<typeof setTimeout>;

    if (!deleting && displayed.length < currentWord.length) {
      timer = setTimeout(() => setDisplayed(currentWord.slice(0, displayed.length + 1)), 40);
    } else if (!deleting && displayed.length === currentWord.length) {
      timer = setTimeout(() => setDeleting(true), 1200);
    } else if (deleting && displayed.length > 0) {
      timer = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 25);
    } else {
      setDeleting(false);
      setIndex((prev) => (prev + 1) % words.length);
    }

    return () => clearTimeout(timer);
  }, [displayed, deleting, index, words]);

  return (
    <span className="ms-2">
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}
