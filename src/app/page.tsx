import { ClosingCall } from "@/components/journey/ClosingCall";
import { FourLevels } from "@/components/journey/FourLevels";
import { Seam } from "@/components/journey/Seam";
import { SiteFooter } from "@/components/journey/SiteFooter";
import { WhatsInAChallenge } from "@/components/journey/WhatsInAChallenge";

// Thin composition: the setup hero (01, builder session's own work) is a
// placeholder here, then the journey sections (02-04) and the footer.
export default function Home() {
  return (
    <>
      <main>
        <section id="setup" className="bg-night p-8 text-cream">
          <h1 className="text-2xl font-semibold">Impromptu</h1>
        </section>
        <Seam from="night" to="lilac" />
        <WhatsInAChallenge />
        <Seam from="lilac" to="paper" />
        <FourLevels />
        <Seam from="paper" to="sun" />
        <ClosingCall />
        <Seam from="sun" to="night" />
      </main>
      <SiteFooter />
    </>
  );
}
