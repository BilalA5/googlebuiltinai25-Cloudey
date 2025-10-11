import type { Route } from "./+types/home";
import  LandingPage  from "../welcome/landingPage";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "exTendifAI" },
    { name: "description", content: "Landing Page for Chrome Extension" },
  ];
}

export default function Home() {
  return <LandingPage />;
}