import SceneMount from "@/components/three/SceneMount";
import SmoothScroll from "@/components/SmoothScroll";
import LocaleProvider from "@/components/LocaleProvider";
import SideNav from "@/components/ui/SideNav";
import LangToggle from "@/components/ui/LangToggle";
import Loader from "@/components/ui/Loader";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Career from "@/components/sections/Career";
import Skills from "@/components/sections/Skills";
import Next from "@/components/sections/Next";
import Works from "@/components/sections/Works";
import Blog from "@/components/sections/Blog";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <SmoothScroll>
      <Loader />
      {/* 3Dは Provider の外に置く。言語を切り替えても再レンダリングが
          Canvas まで波及せず、WebGLの初期化とスクロール位置がそのまま残る */}
      <SceneMount />
      <LocaleProvider>
        <SideNav />
        <LangToggle />
        <main className="relative z-10">
          <Hero />
          <About />
          <Career />
          <Skills />
          <Next />
          <Works />
          <Blog />
          <Contact />
        </main>
      </LocaleProvider>
    </SmoothScroll>
  );
}
