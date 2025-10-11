import logoDark from "./logo-dark.svg";
import logoLight from "./logo-light.svg";
import { ShaderAnimation } from "./shader-lines";


export default function LandingPage() {
  return (
    <div className="relative flex h-[650px] w-full flex-col items-center justify-center overflow-hidden rounded-xl" style={{backgroundColor: '#0C0908'}}>
      <ShaderAnimation/>
      <span className="pointer-events-none z-10 text-center text-7xl leading-none font-semibold tracking-tighter whitespace-pre-wrap text-purple-100">
        exTendifAI 
      </span>
    </div>
  )
}

