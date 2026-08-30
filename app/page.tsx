import SceneMount from "@/components/three/SceneMount";
import SmoothScroll from "@/components/SmoothScroll";
import SideNav from "@/components/ui/SideNav";
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
      <SceneMount />
      <SideNav />
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
    </SmoothScroll>
  );
}
