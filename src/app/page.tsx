import { ChromePiece } from "@/components/journey/ChromePiece";
import { ClosingCall } from "@/components/journey/ClosingCall";
import { FourLevels } from "@/components/journey/FourLevels";
import { Grain } from "@/components/journey/Grain";
import { OrbitThread } from "@/components/journey/OrbitThread";
import { Seam } from "@/components/journey/Seam";
import { SetupHeader } from "@/components/journey/SetupHeader";
import { SiteFooter } from "@/components/journey/SiteFooter";
import { Ticker } from "@/components/journey/Ticker";
import { WhatsInAChallenge } from "@/components/journey/WhatsInAChallenge";
import { SetupHero } from "@/components/setup/SetupHero";

// Thin composition: the setup hero (01, Story 3.7) then the journey
// sections (02-04) and the footer. `relative` on the outer wrapper so
// OrbitThread and Grain — both absolute, `inset-0` — span from the hero to
// the footer in one pass.
export default function Home() {
  return (
    <div className="relative">
      <SetupHeader />
      <main>
        <SetupHero />
        <div className="relative">
          <Seam from="night" to="lilac" />
          <Ticker variant="sun" />
          <ChromePiece name="chrome-drip" className="absolute top-0 right-16 w-16 desktop:w-24" />
        </div>
        <WhatsInAChallenge />
        <div className="relative">
          <Seam from="lilac" to="paper" />
          <ChromePiece name="chrome-tribal" className="absolute top-1/2 left-12 w-14 -translate-y-1/2 desktop:w-20" />
        </div>
        <FourLevels />
        <div className="relative">
          <Seam from="paper" to="sun" />
          <Ticker variant="grape" />
        </div>
        <ClosingCall />
        <div className="relative">
          <Seam from="sun" to="night" />
          <ChromePiece
            name="chrome-ring"
            className="absolute bottom-0 left-1/2 w-20 translate-y-1/3 -translate-x-1/2 desktop:w-28"
          />
        </div>
      </main>
      <SiteFooter />
      <OrbitThread />
      <Grain />
    </div>
  );
}
