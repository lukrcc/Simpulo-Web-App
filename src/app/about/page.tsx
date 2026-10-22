import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <ContentPage
      title="What is Simpulo?"
      intro="Simpulo matches people, not accommodation. Share a place – and find your people."
    >
      <p>
        A House on Simpulo is a shared place – a villa, an apartment, a chalet – opened by one host for two to six
        people, from a long weekend to a few months. The host says what the House is about: training, building,
        creating, slowing down. You ask to join, the host says yes, and the crew sorts out the rest together.
      </p>
      <p>
        No hostel dorms, no strangers you never spoke to. Just people who want the same kind of trip as you.
      </p>
      <p>
        <Link href="/how-it-works" className="font-medium text-accent hover:underline">
          See how it works →
        </Link>
      </p>
    </ContentPage>
  );
}
