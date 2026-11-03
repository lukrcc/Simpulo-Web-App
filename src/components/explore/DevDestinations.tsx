"use client";

import { useState, type ChangeEvent } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { DESTINATION_MIN_INTEREST } from "@/config/explore";
import type { Destination } from "@/lib/data/destinationTypes";
import { setDestinationImage, setDestinationStatus, useDestinations } from "@/lib/destinations";

/** Places people picked that reached the threshold: approve them, give them a picture, or hide them. Dev tool: plain English, no messages. */
export function DevDestinations() {
  const { destinations } = useDestinations();
  const pending = destinations.filter((d) => d.status === "pending");
  const ready = pending.filter((d) => d.interestedCount >= DESTINATION_MIN_INTEREST).toSorted((a, b) => b.interestedCount - a.interestedCount);
  const waiting = pending.length - ready.length;
  return (
    <Container page width="narrow">
      <h1 className="text-h2 tracking-tight text-ink">Destinations to review</h1>
      <p className="mt-2 text-body text-muted">
        Pending places with at least {DESTINATION_MIN_INTEREST} people. {waiting > 0 && `${waiting} more below the threshold.`}
      </p>
      {ready.length === 0 ? (
        <p className="mt-8 text-body text-muted">Nothing to review.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {ready.map((destination) => (
            <Row key={destination.id} destination={destination} />
          ))}
        </ul>
      )}
    </Container>
  );
}

function Row({ destination }: { destination: Destination }) {
  const [note, setNote] = useState<string | null>(null);
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.set("slug", destination.slug);
    body.set("file", file);
    const response = await fetch("/dev/destinations/upload", { method: "POST", body });
    if (!response.ok) {
      setNote("Upload failed.");
      return;
    }
    const { url, tooSmall } = (await response.json()) as { url: string; tooSmall: boolean };
    setDestinationImage(destination.id, url);
    setNote(tooSmall ? "Saved, but it should be landscape and at least 1600px wide." : "Saved.");
  }
  return (
    <li data-dev-destination={destination.id} className="rounded-2xl bg-surface p-5">
      <p className="text-body font-semibold text-ink">
        {destination.name}, {destination.country}
      </p>
      <p className="mt-0.5 text-small text-muted">
        {destination.interestedCount} people · image: {destination.imageSource}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="md" onClick={() => setDestinationStatus(destination.id, "approved")}>
          Approve
        </Button>
        <label className="inline-flex h-9 cursor-pointer items-center rounded-full border border-line bg-surface px-4 text-body hover:bg-bg">
          Replace image
          <input type="file" accept="image/*" onChange={upload} className="sr-only" />
        </label>
        <Button variant="tertiary" size="md" onClick={() => setDestinationStatus(destination.id, "hidden")}>
          Hide
        </Button>
      </div>
      {note && <p className="mt-2 text-small text-muted">{note}</p>}
    </li>
  );
}
