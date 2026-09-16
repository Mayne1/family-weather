import { permanentRedirect } from "next/navigation";

export default function WeatherPlanningRedirect() {
  permanentRedirect("/plan");
}
