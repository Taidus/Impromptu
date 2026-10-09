import { ClosingCall } from "@/components/journey/ClosingCall";
import { FourLevels } from "@/components/journey/FourLevels";
import { Seam } from "@/components/journey/Seam";
import { SiteFooter } from "@/components/journey/SiteFooter";
import { WhatsInAChallenge } from "@/components/journey/WhatsInAChallenge";
import { SetupHero } from "@/components/setup/SetupHero";

// Thin composition: the setup hero (01, Story 3.7) then the journey
// sections (02-04) and the footer.
export default function Home() {
  return (
    <>
      <main>
        <SetupHero />
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
