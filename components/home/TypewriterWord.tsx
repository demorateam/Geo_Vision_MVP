"use client";

import { useEffect, useState } from "react";

type TypewriterWordProps = {
  words: string[];
  className?: string;
};

export function TypewriterWord({ words, className = "" }: TypewriterWordProps) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  const currentWord = words[index] ?? "";

  useEffect(() => {
    if (!words.length) return;

    let timer: ReturnType<typeof setTimeout>;

    if (!deleting && displayed.length < currentWord.length) {
      timer = setTimeout(
        () => setDisplayed(currentWord.slice(0, displayed.length + 1)),
        55,
      );
    } else if (!deleting && displayed.length === currentWord.length) {
      timer = setTimeout(() => setDeleting(true), 1400);
    } else if (deleting && displayed.length > 0) {
      timer = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 32);
    } else {
      setDeleting(false);
      setIndex((previous) => (previous + 1) % words.length);
    }

    return () => clearTimeout(timer);
  }, [currentWord, deleting, displayed, words.length]);

  if (!words.length) return null;

  return (
    <span
      className={`inline-flex max-w-full items-center whitespace-normal text-blue-400 sm:whitespace-nowrap ${className}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <span>{displayed || "\u00a0"}</span>
      <span className="ms-0.5 inline-block animate-pulse" aria-hidden="true">
        |
      </span>
    </span>
  );
}