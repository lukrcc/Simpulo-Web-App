import { EmailLayout, EmailText } from "./EmailLayout";

/** The sign-in link – no unsubscribe: you asked for it. */
export function MagicLinkEmail({ href, origin }: { href: string; origin: string }) {
  return (
    <EmailLayout preview="Tap to sign in – the link works for 15 minutes." headline="Sign in to Simpulo" action={{ label: "Sign in", href }} origin={origin}>
      <EmailText>Tap the button to sign in. The link works once, for 15 minutes.</EmailText>
      <EmailText>Didn&apos;t ask for it? Ignore this email – nothing happens.</EmailText>
    </EmailLayout>
  );
}
