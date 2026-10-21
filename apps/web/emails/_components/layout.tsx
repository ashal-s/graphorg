import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Text,
  Tailwind,
  pixelBasedPreset,
} from "react-email";

type EmailLayoutProps = {
  preview: string;
  children: React.ReactNode;
};

/** Shared shell for GraphOrg transactional mail. Prefixed `_` so it stays out of the preview sidebar. */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Body className="bg-zinc-100 font-sans">
          <Container className="mx-auto my-10 max-w-[560px] rounded-lg bg-white px-8 py-10">
            <Text className="m-0 text-sm font-semibold tracking-wide text-zinc-900">
              GraphOrg
            </Text>
            <Hr className="my-6 border-zinc-200" />
            {children}
            <Hr className="my-6 border-zinc-200" />
            <Text className="m-0 text-xs leading-5 text-zinc-400">
              GraphOrg — organizational context for your team
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
