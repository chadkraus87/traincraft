"use client";
import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/exercises/actions";

export default function FavoriteStar({ exerciseId, initialFavorited }: { exerciseId: string; initialFavorited: boolean }) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className={`text-lg leading-none ${favorited ? "text-signal" : "text-steel/40 hover:text-signal"}`}
      onClick={() => {
        setFavorited((f) => !f);
        startTransition(() => {
          toggleFavorite(exerciseId, favorited);
        });
      }}
    >
      {favorited ? "★" : "☆"}
    </button>
  );
}
