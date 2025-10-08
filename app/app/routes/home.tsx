import type { Route } from "./+types/home";
import { Welcome } from "../welcome/landingPage";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App arash ajdari is a noob 123" },
    { name: "description", content: "Welcome to React Router arash ajdari is a noob 123s!" },
  ];
}

export default function Home() {
  return <Welcome />;
}