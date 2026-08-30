"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { getValidSession, signIn, signOut, signUp } from "./lib/firebaseAuth";
import type { AuthSession } from "./lib/firebaseAuth";
import InvitationCard from "./invitations/InvitationCard";
import LocationSearchInput from "./components/LocationSearchInput";
import { invitationDesigns, suggestedInvitationDesign } from "./invitations/catalog";
import type { InvitationDesignId, InvitationRecord } from "./invitations/catalog";
import type { LocationCandidate } from "./lib/location";

const activities = [
  ["cookout", "♨", "Cookout"],
  ["birthday", "✦", "Birthday"],
  ["park day", "♧", "Park day"],
  ["game", "◉", "Game"],
  ["concert", "♫", "Concert"],
  ["plan", "＋", "Something else"],
];

const TOUR_STORAGE_KEY = "family-weather-walkthrough-v1";
const tourSteps = [
  { target: "activity", label: "Step 1 of 5", title: "Start with the plan", copy: "Choose the kind of event you have in mind. This helps Family Weather give advice that fits what people will actually be doing." },
  { target: "location", label: "Step 2 of 5", title: "Tell us where", copy: "Enter a venue, street address, city, landmark, resort, park, or destination. Choose a match if the name could mean more than one place." },
  { target: "date", label: "Step 3 of 5", title: "Choose the day", copy: "Pick a forecast day or any future date, then check the plan. Dates beyond the forecast window use the five-year Almanac instead." },
  { target: "create", label: "Step 4 of 5", title: "Turn the plan into an event", copy: "When the weather looks right, create the event, save it, choose an invitation design, and invite your people. You only need an account when you save." },
  { target: "almanac", label: "Step 5 of 5", title: "Explore a special date", copy: "The Almanac compares the same calendar day across five prior years for the selected location. It is useful historical guidance, not a promise about the future." },
] as const;

type WeatherDay = { date: string; weather_code: number; temp_max_f: number; temp_min_f: number; precip_prob_pct: number; wind_max_mph: number; shortForecast?: string };
type HomeWeather = { label?: string; lat?: number; lon?: number; timezone?: string | null; current_source?: string; current: { temp_f: number; feels_like_f: number; wind_mph: number; weather_code: number; observed_at?: string; source?: string } | null; days: WeatherDay[] };
type AlmanacYear = { year: number; date: string; high_f: number; low_f: number; precipitation_in: number; rain: boolean; weather_code: number; condition: string };
type AlmanacResult = { targetDate: string; location: string; years: AlmanacYear[]; averageHighF: number; averageLowF: number; averageWindMph: number; rainYears: number; rainFrequencyPct: number; typicalWeatherCode: number; summary: string; source: string };
type PlanAdvice = { tone: string; title: string; copy: string };
type PlanResult = { source: string; location: string; resolvedLocation: LocationCandidate; day: WeatherDay; almanac?: AlmanacResult | null; space: string; activity: string; score: number; bestWindow: string; advice: PlanAdvice[] };
type EventDetails = { name: string; activity: string; guests: string; location: string; date: string; time: string };
type CreatedInvite = { id: string; link: string; delivery: string; design?: InvitationDesignId; recipient_email?: string; recipient_phone?: string; sms?: { ok?: boolean; skipped?: boolean; reason?: string } };

function weatherSymbol(code: number) {
  if (code >= 200 && code < 700) return "☂";
  if (code === 800) return "☀";
  if (code > 800) return "◒";
  return "☁";
}

function weatherDescription(code: number) {
  if (code >= 200 && code < 300) return "Thunderstorms possible.";
  if (code >= 300 && code < 700) return "Wet weather is possible.";
  if (code === 741) return "Reduced visibility is possible.";
  if (code === 800) return "Clear and sunny.";
  if (code === 801) return "Mostly sunny.";
  if (code === 802) return "Partly cloudy.";
  if (code >= 803) return "Mostly cloudy.";
  return "Forecast loaded.";
}

function hasResolvedLocation(label?: string, lat?: number, lon?: number) {
  return Boolean(label && label !== "Your location") || (Number.isFinite(lat) && Number.isFinite(lon));
}

function locationDateTime(timeZone: string | null | undefined, value: Date | null, mode: "date" | "time") {
  if (!value) return mode === "date" ? "Loading local date…" : "Loading…";
  try {
    return value.toLocaleString("en-US", mode === "date"
      ? { timeZone: timeZone || undefined, weekday: "long", month: "long", day: "numeric" }
      : { timeZone: timeZone || undefined, hour: "numeric", minute: "2-digit" });
  } catch {
    return value.toLocaleString("en-US", mode === "date"
      ? { weekday: "long", month: "long", day: "numeric" }
      : { hour: "numeric", minute: "2-digit" });
  }
}

function localDateValue(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function dateValueInTimeZone(timeZone: string | null | undefined, value: Date) {
  if (!timeZone) return localDateValue(value);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
    const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${fields.year}-${fields.month}-${fields.day}`;
  } catch {
    return localDateValue(value);
  }
}

function calendarDate(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function calendarDayOffset(value: string, base: string) {
  return Math.round((calendarDate(value).getTime() - calendarDate(base).getTime()) / 86_400_000);
}

function calendarDateText(value: string, options: Intl.DateTimeFormatOptions) {
  return calendarDate(value).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

export default function Home() {
  const [activity, setActivity] = useState("cookout");
  const [date, setDate] = useState(0);
  const [customDate, setCustomDate] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [eventStep, setEventStep] = useState<"details" | "review">("details");
  const [eventSpace, setEventSpace] = useState("outdoor");
  const [homeWeather, setHomeWeather] = useState<HomeWeather | null>(null);
  const [clock, setClock] = useState<Date | null>(null);
  const [selectedOutlookDay, setSelectedOutlookDay] = useState<WeatherDay | null>(null);
  const [almanacLocation, setAlmanacLocation] = useState("Stockton, CA");
  const [almanacResolved, setAlmanacResolved] = useState<LocationCandidate | null>(null);
  const [almanacSuggestions, setAlmanacSuggestions] = useState<LocationCandidate[]>([]);
  const [almanacDate, setAlmanacDate] = useState("");
  const [almanacResult, setAlmanacResult] = useState<AlmanacResult | null>(null);
  const [almanacLoading, setAlmanacLoading] = useState(false);
  const [almanacError, setAlmanacError] = useState("");
  const [homeLocation, setHomeLocation] = useState("Stockton, California");
  const [plannerLocation, setPlannerLocation] = useState("Stockton, CA 95206");
  const [plannerResolved, setPlannerResolved] = useState<LocationCandidate | null>(null);
  const [plannerSuggestions, setPlannerSuggestions] = useState<LocationCandidate[]>([]);
  const [eventLocation, setEventLocation] = useState("Stockton, CA 95206");
  const [eventResolved, setEventResolved] = useState<LocationCandidate | null>(null);
  const [eventSuggestions, setEventSuggestions] = useState<LocationCandidate[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedEvent, setSavedEvent] = useState<{ id: string; title: string } | null>(null);
  const [saveError, setSaveError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [createdInvites, setCreatedInvites] = useState<CreatedInvite[]>([]);
  const [inviteDesign, setInviteDesign] = useState<InvitationDesignId>("birthday-after-dark");
  const [invitationHeadline, setInvitationHeadline] = useState("");
  const [invitationHonoree, setInvitationHonoree] = useState("");
  const [invitationMessage, setInvitationMessage] = useState("");
  const [invitationInstructions, setInvitationInstructions] = useState("");
  const [invitationSaved, setInvitationSaved] = useState(false);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [tourMode, setTourMode] = useState<"closed" | "welcome" | "active">("closed");
  const [tourStep, setTourStep] = useState(0);

  const closeTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "complete");
    setTourMode("closed");
  };

  const startTour = () => {
    setTourStep(0);
    setTourMode("active");
  };

  const advanceTour = () => {
    if (tourStep >= tourSteps.length - 1) closeTour();
    else setTourStep((current) => current + 1);
  };

  useEffect(() => {
    if (localStorage.getItem(TOUR_STORAGE_KEY)) return;
    const timer = window.setTimeout(() => setTourMode("welcome"), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (tourMode !== "active") return;
    const target = document.querySelector<HTMLElement>(`[data-tour="${tourSteps[tourStep].target}"]`);
    target?.classList.add("tourTarget");
    target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    const handleKeyDown = (event: KeyboardEvent) => event.key === "Escape" && closeTour();
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      target?.classList.remove("tourTarget");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tourMode, tourStep]);

  useEffect(() => {
    getValidSession().then(setSession);
    const now = new Date();
    setClock(now);
    setAlmanacDate(localDateValue(now));

    const applyWeather = (data: HomeWeather, updatePlanner = false) => {
      setHomeWeather(data);
      if (hasResolvedLocation(data.label, data.lat, data.lon)) {
        setHomeLocation(data.label!);
        if (updatePlanner) setPlannerLocation(data.label!);
        return true;
      }
      return false;
    };

    const loadDefault = () =>
      fetch("/api/weather/home", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((data) => data.ok && applyWeather(data))
        .catch(() => undefined);

    const loadCoordinates = (coordinates: { lat: number; lon: number }, remember: boolean) =>
      fetch(`/api/weather/home?lat=${coordinates.lat}&lon=${coordinates.lon}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((data) => {
          if (!data.ok || !hasResolvedLocation(data.label, data.lat, data.lon)) {
            localStorage.removeItem("family-weather-home-location");
            return false;
          }
          if (remember) {
            localStorage.setItem("family-weather-home-location", JSON.stringify({
              ...coordinates,
              savedAt: Date.now(),
            }));
          }
          applyWeather(data, true);
          return true;
        })
        .catch(() => {
          localStorage.removeItem("family-weather-home-location");
          return false;
        });

    const saved = localStorage.getItem("family-weather-home-location");
    if (saved) {
      try {
        const coordinates = JSON.parse(saved);
        const fresh = Number(coordinates.savedAt || 0) > Date.now() - 6 * 60 * 60 * 1000;
        if (fresh && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lon)) {
          loadCoordinates(coordinates, false).then((loaded) => {
            if (!loaded) loadDefault();
          });
          return;
        }
        localStorage.removeItem("family-weather-home-location");
      } catch {
        localStorage.removeItem("family-weather-home-location");
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        loadCoordinates({ lat: coords.latitude, lon: coords.longitude }, true).then((loaded) => {
          if (!loaded) loadDefault();
        });
      }, loadDefault, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    } else {
      loadDefault();
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const coordinates = { lat: coords.latitude, lon: coords.longitude };
      fetch(`/api/weather/home?lat=${coordinates.lat}&lon=${coordinates.lon}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((data) => {
          if (!data.ok || !hasResolvedLocation(data.label, data.lat, data.lon)) {
            throw new Error("We could not verify that location.");
          }
          localStorage.setItem("family-weather-home-location", JSON.stringify({
            ...coordinates,
            savedAt: Date.now(),
          }));
          setHomeWeather(data);
          setHomeLocation(data.label);
          setPlannerLocation(data.label);
          setPlannerResolved(null);
        })
        .catch(() => localStorage.removeItem("family-weather-home-location"))
        .finally(() => setLocationLoading(false));
    }, () => setLocationLoading(false), {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  };

  const homeLocalDate = clock ? dateValueInTimeZone(homeWeather?.timezone, clock) : almanacDate;
  const availableDays = (homeWeather?.days || []).filter((day) => !homeLocalDate || day.date >= homeLocalDate);
  const dateChoices = availableDays.slice(0, 4);
  const chosenDay = dateChoices[date] || availableDays[0] || null;
  const selectedDate = customDate || chosenDay?.date || homeLocalDate;
  const selectedDay = plan?.day || chosenDay;
  const selectedBestWindow = plan?.bestWindow || (selectedDay ? selectedDay.temp_max_f >= 90 ? "5–8 PM" : selectedDay.temp_max_f >= 82 ? "4–7 PM" : selectedDay.temp_max_f < 65 ? "1–4 PM" : "12–3 PM" : "Checking…");

  const checkPlan = async () => {
    setPlanLoading(true);
    setPlanError("");
    setPlan(null);
    try {
      const response = await fetch("/api/weather/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: plannerLocation, resolvedLocation: plannerResolved, date: selectedDate, activity, space: "outdoor" }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (response.status === 409) setPlannerSuggestions(data.suggestions || []);
        throw new Error(data.error || "Weather check failed");
      }
      setPlannerResolved(data.resolvedLocation);
      setPlannerLocation(data.resolvedLocation?.label || plannerLocation);
      setPlannerSuggestions([]);
      setPlan(data);
      setShowResult(true);
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "Weather check failed");
    } finally {
      setPlanLoading(false);
    }
  };

  const checkAlmanac = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAlmanacLoading(true);
    setAlmanacError("");
    setAlmanacResult(null);
    try {
      const response = await fetch("/api/weather/almanac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: almanacLocation, resolvedLocation: almanacResolved, date: almanacDate }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (response.status === 409) setAlmanacSuggestions(data.suggestions || []);
        throw new Error(data.error || "Almanac lookup failed");
      }
      setAlmanacResolved(data.resolvedLocation);
      setAlmanacLocation(data.resolvedLocation?.label || almanacLocation);
      setAlmanacSuggestions([]);
      setAlmanacResult(data.almanac);
    } catch (error) {
      setAlmanacError(error instanceof Error ? error.message : "Almanac lookup failed");
    } finally {
      setAlmanacLoading(false);
    }
  };

  const openEvent = () => {
    setShowResult(false);
    setEventStep("details");
    setEventLocation(plannerResolved?.label || plannerLocation);
    setEventResolved(plannerResolved);
    setEventSuggestions([]);
    setShowEvent(true);
  };

  const reviewEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPlanLoading(true);
    setPlanError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const details = {
      name: String(values.name || "Family event"),
      activity: String(values.activity || "event"),
      guests: String(values.guests || ""),
      location: eventLocation,
      date: String(values.date || ""),
      time: String(values.time || ""),
    };
    try {
      const response = await fetch("/api/weather/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, location: eventLocation, resolvedLocation: eventResolved, space: eventSpace }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (response.status === 409) setEventSuggestions(data.suggestions || []);
        throw new Error(data.error || "Weather check failed");
      }
      const resolved = data.resolvedLocation as LocationCandidate;
      setEventResolved(resolved);
      setEventLocation(resolved.label);
      setEventSuggestions([]);
      setEventDetails({ ...details, location: resolved.label });
      setPlan(data);
      setEventStep("review");
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "Weather check failed");
    } finally {
      setPlanLoading(false);
    }
  };

  const authenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setAuthLoading(true);
    setAuthError("");
    try {
      const email = String(values.get("email") || "").trim();
      const password = String(values.get("password") || "");
      const nextSession = authMode === "signin" ? await signIn(email, password) : await signUp(email, password);
      setSession(nextSession);
      setShowAuth(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const saveEvent = async () => {
    const activeSession = await getValidSession();
    if (!activeSession) {
      setSession(null);
      setShowAuth(true);
      return;
    }
    setSession(activeSession);
    if (!eventDetails || !plan) return;
    setSaveLoading(true);
    setSaveError("");
    try {
      const starts = new Date(`${eventDetails.date}T${eventDetails.time || "12:00"}:00`);
      const ends = new Date(starts.getTime() + 3 * 60 * 60 * 1000);
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeSession.idToken}` },
        body: JSON.stringify({
          title: eventDetails.name,
          description: `${eventDetails.activity} · ${eventSpace} · ${eventDetails.guests || "unspecified"} guests · Weather fit ${plan.score}/100 · Best window ${plan.bestWindow}`,
          location: eventDetails.location,
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (response.status === 401) {
          signOut();
          setSession(null);
          setShowAuth(true);
          throw new Error("Your sign-in expired. Please sign in again.");
        }
        throw new Error(data.error || "Event could not be saved");
      }
      setSavedEvent(data.event);
      if (eventResolved) {
        const locationResponse = await fetch(`/api/events/${encodeURIComponent(data.event.id)}/location`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeSession.idToken}` },
          body: JSON.stringify(eventResolved),
        });
        const locationData = await locationResponse.json();
        if (!locationResponse.ok || !locationData.ok) {
          throw new Error(locationData.error || "Event saved, but its coordinates could not be stored");
        }
      }
      setInvitationHeadline(data.event.title);
      setInviteDesign(suggestedInvitationDesign(eventDetails.activity));
      setInvitationSaved(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Event could not be saved");
    } finally {
      setSaveLoading(false);
    }
  };

  const currentInvitation: InvitationRecord = {
    design_id: inviteDesign,
    headline: invitationHeadline || savedEvent?.title || eventDetails?.name || "You’re invited",
    honoree_names: invitationHonoree,
    message: invitationMessage,
    special_instructions: invitationInstructions,
  };

  const saveInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!savedEvent) return;
    setInvitationLoading(true);
    setInviteError("");
    try {
      const activeSession = await getValidSession();
      if (!activeSession) throw new Error("Your sign-in expired. Sign in again before saving the invitation.");
      const response = await fetch(`/api/events/${encodeURIComponent(savedEvent.id)}/invitation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeSession.idToken}` },
        body: JSON.stringify(currentInvitation),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Invitation could not be saved");
      setInvitationSaved(true);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Invitation could not be saved");
    } finally {
      setInvitationLoading(false);
    }
  };

  const createInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!savedEvent) return;
    const values = new FormData(event.currentTarget);
    const recipientText = String(values.get("recipients") || "").trim();
    const recipients = [...new Set(
      recipientText
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    )];
    const invalid = recipients.filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (!recipients.length) {
      setInviteError("Enter at least one email address.");
      return;
    }
    if (recipients.length > 100) {
      setInviteError("Paste no more than 100 email addresses at a time.");
      return;
    }
    if (invalid.length) {
      setInviteError(`Fix these email addresses: ${invalid.slice(0, 5).join(", ")}${invalid.length > 5 ? "…" : ""}`);
      return;
    }
    setInviteLoading(true);
    setInviteError("");
    try {
      const activeSession = await getValidSession();
      if (!activeSession) throw new Error("Your sign-in expired. Sign in again before creating an invitation.");
      setSession(activeSession);
      const response = await fetch(`/api/events/${encodeURIComponent(savedEvent.id)}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeSession.idToken}` },
        body: JSON.stringify({
          delivery: "email",
          recipient_emails: recipients,
          created_by_email: activeSession.email,
          design: inviteDesign,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Invitation could not be created");
      setCreatedInvites((current) => [...data.invites, ...current]);
      form.reset();
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Invitation could not be created");
    } finally {
      setInviteLoading(false);
    }
  };

  const createShareableInvite = async () => {
    if (!savedEvent) return;
    setInviteLoading(true);
    setInviteError("");
    try {
      const activeSession = await getValidSession();
      if (!activeSession) throw new Error("Your sign-in expired. Sign in again before creating an invitation.");
      setSession(activeSession);
      const response = await fetch(`/api/events/${encodeURIComponent(savedEvent.id)}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeSession.idToken}` },
        body: JSON.stringify({ shareable: true, design: inviteDesign }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Shareable invitation could not be created");
      setCreatedInvites((current) => [...data.invites, ...current]);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Shareable invitation could not be created");
    } finally {
      setInviteLoading(false);
    }
  };

  const today = availableDays.find((item) => item.date === homeLocalDate) || availableDays[0];
  const liveForecast = availableDays.length
    ? availableDays.map((item) => { const offset = calendarDayOffset(item.date, homeLocalDate); return ({ label: offset === 0 ? "TODAY" : offset === 1 ? "TOMORROW" : calendarDateText(item.date, { weekday: "short" }).toUpperCase(), day: calendarDateText(item.date, { weekday: "long" }), icon: weatherSymbol(item.weather_code), temp: `${item.temp_max_f}°`, lead: item.precip_prob_pct < 20 ? "Low rain risk" : "Watch the rain", copy: `${item.precip_prob_pct}% chance · wind ${item.wind_max_mph} mph`, style: offset === 0 ? "featured" : item.precip_prob_pct >= 40 ? "caution" : "", weather: item }); })
    : [];

  return (
    <>
      <div className="weatherScene" aria-hidden="true">
        <span className="sunGlow" />
        <span className="cloud cloudOne" />
        <span className="cloud cloudTwo" />
      </div>

      <header className="siteHeader">
        <a className="brand" href="#top" aria-label="Family Weather home">
          <span className="brandMark"><i /><i /><i /></span>
          <span><strong>Family Weather</strong><small>Plan together. Weather better.</small></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#planner">Plan</a><a href="#outlook">Outlook</a><a href="#almanac">Almanac</a><a href="#how">How it works</a><Link href="/events">My events</Link>
        </nav>
        <div className="headerActions">
          {session ? <button className="textButton" type="button" onClick={() => { signOut(); setSession(null); }}>{session.email} · Sign out</button> : <button className="textButton" type="button" onClick={() => setShowAuth(true)}>Sign in</button>}
          <button className="pillButton" type="button" onClick={openEvent} data-tour="create">Create event</button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="heroCopy">
            <p className="eyebrow"><span /> {homeLocation} · {locationDateTime(homeWeather?.timezone, clock, "date")}</p>
            <h1>Make the plan.<br /><em>Know the weather.</em></h1>
            <p className="intro">Family Weather turns the forecast into a simple decision—when to go, what to expect, and what your people need to know.</p>
            <div className="decisionCard">
              <div className="decisionTop"><span className="statusDot" /><span>{homeLocation} right now · {locationDateTime(homeWeather?.timezone, clock, "time")}</span><strong>{homeWeather?.current ? "LIVE" : homeWeather ? "UNAVAILABLE" : "LOADING"}</strong></div>
              <div className="decisionMain">
                <div><span className="temperature">{homeWeather?.current?.temp_f ?? "—"}°</span><span className="condition">Feels like {homeWeather?.current?.feels_like_f ?? "—"}°<br />Wind {homeWeather?.current?.wind_mph ?? "—"} mph</span></div>
                <div className="todayRange" aria-label="Today’s high and low"><span><b>{today?.temp_max_f ?? "—"}°</b><small>HIGH</small></span><span><b>{today?.temp_min_f ?? "—"}°</b><small>LOW</small></span></div>
              </div>
              <p><strong>{today ? today.shortForecast || weatherDescription(today.weather_code) : "Loading forecast…"}</strong> {today ? `${today.precip_prob_pct}% rain chance with wind near ${today.wind_max_mph} mph.${homeWeather?.current ? "" : " The current observation is temporarily unavailable."}` : "Real weather is being requested from the Family Weather engine."}</p>
            </div>
          </div>

          <div className="plannerCard" id="planner">
            <p className="stepLabel">Plan something</p><h2>What are we doing?</h2>
            <div className="activityGrid" role="group" aria-label="Choose an activity" data-tour="activity">
              {activities.map(([value, icon, label]) => (
                <button key={value} className={`activity ${activity === value ? "active" : ""}`} onClick={() => setActivity(value)} type="button"><span>{icon}</span>{label}</button>
              ))}
            </div>
            <label className="fieldLabel" htmlFor="location">Where?</label>
            <div className="inputShell" data-tour="location"><span aria-hidden="true">⌖</span><LocationSearchInput id="location" value={plannerLocation} forcedSuggestions={plannerSuggestions} onChange={(value) => { setPlannerLocation(value); setPlannerResolved(null); setPlannerSuggestions([]); }} onSelect={(candidate) => { setPlannerLocation(candidate.label); setPlannerResolved(candidate); setPlannerSuggestions([]); }} /><button type="button" onClick={useCurrentLocation} disabled={locationLoading} aria-label="Use current location">{locationLoading ? "…" : "◎"}</button></div>
            <div className="tourDateBlock" data-tour="date">
              <span className="fieldLabel">When?</span>
              <div className="dateRow">
              {dateChoices.map((choice, index) => { const offset = calendarDayOffset(choice.date, homeLocalDate); return (
                <button key={choice.date} className={`dateOption ${!customDate && date === index ? "active" : ""}`} onClick={() => { setDate(index); setCustomDate(""); }} type="button"><small>{calendarDateText(choice.date, { weekday: "short" }).toUpperCase()}</small><strong>{calendarDate(choice.date).getUTCDate()}</strong><span>{offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : calendarDateText(choice.date, { weekday: "long" })}</span></button>
              ); })}
              {!dateChoices.length && Array.from({ length: 4 }, (_, index) => <span className="dateOption dateOptionLoading" aria-hidden="true" key={index}><small>···</small><strong>—</strong><span>Loading</span></span>)}
              </div>
              <label className={`otherDateOption ${customDate ? "active" : ""}`}>
              <span className="calendarMark" aria-hidden="true">▦</span>
              <span className="otherDateCopy"><strong>Choose another date</strong><small>Any future day</small></span>
              <input type="date" min={homeLocalDate || undefined} value={customDate} onChange={(event) => setCustomDate(event.target.value)} aria-label="Choose another future date" />
              </label>
              <button className="primaryCta" type="button" onClick={checkPlan} disabled={planLoading || !selectedDate}>{planLoading ? "Checking the sky…" : "Check my plan"} <span>→</span></button>
              {planError && <p className="formError" role="alert">{planError}</p>}
              <p className="quietNote">No account needed to check the weather.</p>
            </div>
          </div>
        </section>

        <section className="outlook" id="outlook">
          <div className="sectionHeading"><div><p className="eyebrow dark"><span /> The next few days</p><h2>Weather you can use.</h2></div><p>Not just numbers. Each day comes with a plain-language recommendation for your plans.</p></div>
          <div className="forecastGrid">
            {liveForecast.map(({ label, day, icon, temp, lead, copy, style, weather }) => (
              <button className={`forecastDay ${style}`} key={`${label}-${day}`} type="button" onClick={() => weather && setSelectedOutlookDay(weather)} aria-label={`View detailed weather for ${day}`}><div><small>{label}</small><h3>{day}</h3></div><span className="weatherIcon" aria-hidden="true">{icon}</span><strong>{temp}</strong><p><b>{lead}</b> {copy}</p><span className="forecastMore">View details</span></button>
            ))}
            {!liveForecast.length && <p className="forecastLoading" role="status">Loading the real forecast…</p>}
          </div>
        </section>

        <section className="almanacSection" id="almanac" data-tour="almanac">
          <div className="almanacIntro"><p className="eyebrow dark"><span /> Five-year weather history</p><h2>What has this date done before?</h2><p>Choose a destination and calendar day. Family Weather will compare that same date across five prior years—anywhere our worldwide history covers.</p></div>
          <div className="almanacCard">
            <form onSubmit={checkAlmanac}>
              <label><span>LOCATION</span><LocationSearchInput id="almanac-location" value={almanacLocation} forcedSuggestions={almanacSuggestions} onChange={(value) => { setAlmanacLocation(value); setAlmanacResolved(null); setAlmanacSuggestions([]); }} onSelect={(candidate) => { setAlmanacLocation(candidate.label); setAlmanacResolved(candidate); setAlmanacSuggestions([]); }} /></label>
              <label><span>SPECIAL DATE</span><input type="date" value={almanacDate} onChange={(event) => setAlmanacDate(event.target.value)} required /></label>
              <button className="primaryCta" type="submit" disabled={almanacLoading}>{almanacLoading ? "Looking through history…" : "Check the almanac"}<span>→</span></button>
            </form>
            {almanacError && <p className="formError" role="alert">{almanacError}</p>}
            {!almanacResult && !almanacError && <div className="almanacEmpty"><strong>A weather time machine, minus the questionable wiring.</strong><p>This reports recorded historical patterns. It does not pretend five old Tuesdays can guarantee the next one.</p></div>}
            {almanacResult && <div className="almanacResults"><p className="almanacPlace">{almanacResult.location}</p><div className="almanacSummary"><div><small>AVG HIGH</small><strong>{almanacResult.averageHighF}°</strong></div><div><small>AVG LOW</small><strong>{almanacResult.averageLowF}°</strong></div><div><small>RAIN HISTORY</small><strong>{almanacResult.rainYears}/{almanacResult.years.length}</strong></div></div><p>{almanacResult.summary}</p><p className="almanacDisclaimer" role="note"><strong>Historical pattern only — not a forecast.</strong></p><div className="almanacYears">{almanacResult.years.map((year) => <article key={year.date}><strong>{year.year}</strong><span>{year.condition}</span><b>{year.high_f}° / {year.low_f}°</b><small>{year.rain ? `${year.precipitation_in.toFixed(2)} in rain` : "No rain recorded"}</small></article>)}</div></div>}
          </div>
        </section>

        <section className="how" id="how">
          <p className="eyebrow dark"><span /> One plan, everybody informed</p><h2>From “what if?” to “we’re ready.”</h2>
          <div className="steps">
            <article><span>01</span><h3>Tell us the plan</h3><p>Pick the activity, place and date. Checking a plan doesn’t require an account.</p></article>
            <article><span>02</span><h3>Get a real answer</h3><p>See the best time, the important risks and practical advice—not a wall of weather data.</p></article>
            <article><span>03</span><h3>Keep people together</h3><p>Create the event, invite your people and send updates if the weather changes.</p></article>
          </div>
          <button className="tourReplay" type="button" onClick={startTour}>Show me around</button>
        </section>
      </main>

      <footer><div className="brand"><span className="brandMark"><i /><i /><i /></span><span><strong>Family Weather</strong><small>Plans change. Families stay connected.</small></span></div><p><a href="mailto:contact@thefamilyweather.com">contact@thefamilyweather.com</a></p><p><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/sms-consent">SMS consent</Link></p></footer>

      {tourMode === "welcome" && <section className="tourWelcome" role="dialog" aria-modal="false" aria-labelledby="tour-welcome-title"><button className="tourClose" type="button" onClick={closeTour} aria-label="Close walkthrough">×</button><p className="tourLabel">NEW TO FAMILY WEATHER?</p><h2 id="tour-welcome-title">Let us show you around.</h2><p>Take a quick walk through planning the weather, creating an event, and inviting your people.</p><div className="tourActions"><button className="tourSecondary" type="button" onClick={closeTour}>Skip</button><button className="tourPrimary" type="button" onClick={startTour}>Start tour <span>→</span></button></div></section>}

      {tourMode === "active" && <section className="tourPanel" role="dialog" aria-modal="false" aria-live="polite" aria-labelledby="tour-step-title"><button className="tourClose" type="button" onClick={closeTour} aria-label="Close walkthrough">×</button><div className="tourProgress" aria-hidden="true">{tourSteps.map((_, index) => <i className={index <= tourStep ? "active" : ""} key={index} />)}</div><p className="tourLabel">{tourSteps[tourStep].label}</p><h2 id="tour-step-title">{tourSteps[tourStep].title}</h2><p>{tourSteps[tourStep].copy}</p><div className="tourActions"><button className="tourSecondary" type="button" onClick={() => tourStep === 0 ? closeTour() : setTourStep((current) => current - 1)}>{tourStep === 0 ? "Skip" : "Back"}</button><button className="tourPrimary" type="button" onClick={advanceTour}>{tourStep === tourSteps.length - 1 ? "Finish" : "Next"} <span>→</span></button></div></section>}

      {showResult && plan && <div className="modal" role="dialog" aria-modal="true" aria-labelledby="result-title" onMouseDown={(event) => event.target === event.currentTarget && setShowResult(false)}><div className="modalCard"><button className="close" type="button" onClick={() => setShowResult(false)} aria-label="Close">×</button><p className="eyebrow dark"><span /> {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p><h2 id="result-title">{plan.almanac ? "Here’s the historical pattern." : `Your ${activity} has a weather window.`}</h2><p className="resultLocation">{plan.almanac ? "Five-year history" : plan.source === "nws" ? "Official NWS forecast" : "Worldwide forecast"} for <strong>{plan.location}</strong></p><div className="resultAnswer"><span>{plan.almanac ? "PLANNING BASIS" : "BEST TIME"}</span><strong>{selectedBestWindow}</strong></div><p>{plan.almanac ? `${plan.almanac.summary} Average high ${plan.day.temp_max_f}° and low ${plan.day.temp_min_f}°. This is historical guidance, not a forecast.` : `${plan.day.shortForecast || "Forecast available"}. High ${plan.day.temp_max_f}°, ${plan.day.precip_prob_pct}% rain chance, and wind near ${plan.day.wind_max_mph} mph.`}</p><button className="primaryCta" type="button" onClick={openEvent}>Create this event <span>→</span></button></div></div>}

      {selectedOutlookDay && <div className="modal" role="dialog" aria-modal="true" aria-labelledby="outlook-detail-title" onMouseDown={(event) => event.target === event.currentTarget && setSelectedOutlookDay(null)}><div className="modalCard outlookDetail"><button className="close" type="button" onClick={() => setSelectedOutlookDay(null)} aria-label="Close">×</button><p className="eyebrow dark"><span /> Daily details</p><h2 id="outlook-detail-title">{new Date(`${selectedOutlookDay.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h2><p>{selectedOutlookDay.shortForecast || weatherDescription(selectedOutlookDay.weather_code)}</p><div className="outlookFacts"><div><small>HIGH</small><strong>{selectedOutlookDay.temp_max_f}°</strong></div><div><small>LOW</small><strong>{selectedOutlookDay.temp_min_f}°</strong></div><div><small>RAIN</small><strong>{selectedOutlookDay.precip_prob_pct}%</strong></div><div><small>WIND</small><strong>{selectedOutlookDay.wind_max_mph} mph</strong></div></div></div></div>}

      {showEvent && (
        <div className="eventOverlay" role="dialog" aria-modal="true" aria-labelledby="event-title" onMouseDown={(event) => event.target === event.currentTarget && setShowEvent(false)}>
          <section className="eventPanel">
            <button className="close" type="button" onClick={() => setShowEvent(false)} aria-label="Close">×</button>
            <div className="eventHeader">
              <p className="eyebrow dark"><span /> Create an event</p>
              <p className="progressLabel">{eventStep === "details" ? "01 · THE PLAN" : "02 · WEATHER CHECK"}</p>
            </div>

            {eventStep === "details" ? (
              <form className="eventForm" onSubmit={reviewEvent}>
                <h2 id="event-title">Tell us what you’re planning.</h2>
                <p className="formIntro">Just the useful details. We’ll use them to judge the weather for this particular event.</p>

                <div className="formGrid">
                  <label className="formField full"><span>Event name</span><input name="name" required placeholder="Johnson family cookout" /></label>
                  <label className="formField"><span>Activity</span><select name="activity" defaultValue={activity}><option>cookout</option><option>birthday</option><option>park day</option><option>game</option><option>concert</option><option>family gathering</option><option>other</option></select></label>
                  <label className="formField"><span>Guests</span><input name="guests" type="number" min="1" defaultValue="12" /></label>
                  <label className="formField full"><span>Venue, landmark, address, city, or postal code</span><LocationSearchInput id="event-location" name="location" required value={eventLocation} forcedSuggestions={eventSuggestions} onChange={(value) => { setEventLocation(value); setEventResolved(null); setEventSuggestions([]); }} onSelect={(candidate) => { setEventLocation(candidate.label); setEventResolved(candidate); setEventSuggestions([]); }} /></label>
                  <label className="formField"><span>Date</span><input name="date" type="date" defaultValue={selectedDate} /></label>
                  <label className="formField"><span>Start time</span><input name="time" type="time" defaultValue="16:00" /></label>
                </div>

                <fieldset className="spaceChoice">
                  <legend>Where will people spend their time?</legend>
                  <div>
                    {[["indoor", "⌂", "Indoor", "Weather matters mostly for travel."], ["outdoor", "☀", "Outdoor", "Comfort and exposure matter most."], ["both", "◐", "Both", "We’ll evaluate inside and outside." ]].map(([value, icon, title, copy]) => (
                      <button key={value} className={eventSpace === value ? "active" : ""} type="button" onClick={() => setEventSpace(value)}><b>{icon}</b><span><strong>{title}</strong><small>{copy}</small></span></button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="concerns">
                  <legend>What could ruin the plan?</legend>
                  <label><input name="concern" value="rain" type="checkbox" defaultChecked /> Rain</label><label><input name="concern" value="heat" type="checkbox" defaultChecked /> Heat</label><label><input name="concern" value="wind" type="checkbox" /> Wind</label><label><input name="concern" value="air" type="checkbox" /> Air quality</label>
                </fieldset>

                {planError && <p className="formError">{planError}</p>}
                <button className="primaryCta" type="submit" disabled={planLoading}>{planLoading ? "Checking real weather…" : "Review the weather fit"} <span>→</span></button>
              </form>
            ) : (
              <div className="eventReview">
                <button className="backButton" type="button" onClick={() => setEventStep("details")}>← Edit details</button>
                <h2>{(plan?.score ?? 0) >= 80 ? "This plan has a strong weather window." : (plan?.score ?? 0) >= 60 ? "This plan can work with preparation." : "This plan needs a backup."}</h2>
                <p className="formIntro">Real {plan?.source?.toUpperCase() || "weather"} data for {plan?.location}. The recommendation reflects an {plan?.space} {plan?.activity}.</p>
                <div className="reviewScore"><div><small>WEATHER FIT</small><strong>{plan?.score ?? "—"}</strong><span>out of 100</span></div><div><small>BEST WINDOW</small><strong>{plan?.bestWindow ?? "—"}</strong><span>Based on the selected setting</span></div></div>
                <div className="adviceList">{plan?.advice.map((item) => <article key={item.title} className={item.tone === "warn" ? "warning" : ""}><span>{item.tone === "warn" ? "!" : "✓"}</span><div><strong>{item.title}</strong><p>{item.copy}</p></div></article>)}</div>
                {savedEvent ? <>
                  <div className="savedNotice"><strong>Event saved.</strong><span>{savedEvent.title} is now in Family Weather.</span></div>
                  <div className="inviteBuilder">
                    <div><small>03 · DESIGN THE INVITATION</small><h3>Give people something worth keeping.</h3><p>This is the actual guest-facing invitation. The RSVP page remains a separate, temporary form for recording an answer.</p></div>
                    <form className="invitationCustomizer" onSubmit={saveInvitation}>
                      <fieldset className="designChooser">
                        <legend>Choose a professional starting design</legend>
                        <div>{invitationDesigns.map((design) => <button className={inviteDesign === design.id ? "active" : ""} type="button" key={design.id} onClick={() => { setInviteDesign(design.id); setInvitationSaved(false); }} aria-pressed={inviteDesign === design.id}><b style={{ backgroundImage: `url('${design.artwork}')` }}>{design.mark}</b><span><strong>{design.name}</strong><small>{design.category} · {design.note}</small></span></button>)}</div>
                      </fieldset>
                      <div className="invitationWorkArea">
                        <InvitationCard compact invitation={currentInvitation} event={{ title: savedEvent.title, description: eventDetails?.activity, location: eventDetails?.location, starts_at: eventDetails ? new Date(`${eventDetails.date}T${eventDetails.time || "12:00"}:00`).toISOString() : undefined }} />
                        <div className="invitationFields">
                          <label className="formField"><span>Headline</span><input value={invitationHeadline} onChange={(event) => { setInvitationHeadline(event.target.value); setInvitationSaved(false); }} maxLength={120} placeholder={savedEvent.title} /></label>
                          <label className="formField"><span>Person, couple, or group being celebrated (optional)</span><input value={invitationHonoree} onChange={(event) => { setInvitationHonoree(event.target.value); setInvitationSaved(false); }} maxLength={160} placeholder="Maya & Jordan" /></label>
                          <label className="formField"><span>Invitation message</span><textarea value={invitationMessage} onChange={(event) => { setInvitationMessage(event.target.value); setInvitationSaved(false); }} rows={4} maxLength={500} placeholder="Please join us for a day worth remembering." /></label>
                          <label className="formField"><span>Dress code or special instructions (optional)</span><textarea value={invitationInstructions} onChange={(event) => { setInvitationInstructions(event.target.value); setInvitationSaved(false); }} rows={3} maxLength={300} placeholder="Dressy casual · Ceremony begins promptly" /></label>
                        </div>
                      </div>
                      <button className="primaryCta" disabled={invitationLoading}>{invitationLoading ? "Saving invitation…" : invitationSaved ? "Invitation saved" : "Save invitation design"}<span>{invitationSaved ? "✓" : "→"}</span></button>
                    </form>
                    {invitationSaved && <>
                      <div className="shareLinkOption"><div><strong>Need one link for a family chat?</strong><small>Create one general invitation that everybody can open and identify themselves on.</small></div><button type="button" onClick={createShareableInvite} disabled={inviteLoading}>Create shareable link</button></div>
                      <form className="invitePeopleForm" onSubmit={createInvite}>
                        <div className="invitePeopleIntro"><small>04 · INVITE YOUR PEOPLE</small><h3>Create private invitation links.</h3><p>Paste up to 100 email addresses. Separate them with commas, semicolons, spaces, or new lines. Each person receives their own private invitation and response link.</p></div>
                        <label className="formField"><span>Family members’ email addresses</span><textarea name="recipients" required rows={5} placeholder={"maya@example.com, jordan@example.com\\nterry@example.com"} /></label>
                        <button className="primaryCta" disabled={inviteLoading}>{inviteLoading ? "Creating invitations…" : "Create invitations"}<span>→</span></button>
                      </form>
                    </>}
                    {inviteError && <p className="formError">{inviteError}</p>}
                  </div>
                  {createdInvites.length > 0 && <div className="inviteResults">{createdInvites.map((invite) => <article key={invite.id}><div><strong>{invite.recipient_email || "Shareable invitation"}</strong><small>{invitationDesigns.find((design) => design.id === invite.design)?.name || "Invitation"} · ready to share</small></div><button type="button" onClick={() => navigator.clipboard.writeText(invite.link)}>Copy link</button><a href={invite.link} target="_blank" rel="noreferrer">Open</a></article>)}</div>}
                </> : <button className="primaryCta" type="button" onClick={saveEvent} disabled={saveLoading}>{saveLoading ? "Saving event…" : session ? "Save event and continue to invitations" : "Sign in to save this event"} <span>→</span></button>}
                {saveError && <p className="formError">{saveError}</p>}
                <p className="quietNote">{savedEvent ? `Event ID: ${savedEvent.id}` : session ? `Saving as ${session.email}` : "Your plan stays on this screen while you sign in."}</p>
              </div>
            )}
          </section>
        </div>
      )}

      {showAuth && <div className="modal authModal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.target === event.currentTarget && setShowAuth(false)}><form className="modalCard" onSubmit={authenticate}><button className="close" type="button" onClick={() => setShowAuth(false)} aria-label="Close">×</button><p className="eyebrow dark"><span /> Family Weather account</p><h2 id="auth-title">{authMode === "signin" ? "Welcome back." : "Create your account."}</h2><p>{authMode === "signin" ? "Sign in to save this plan and invite your family." : "Use your email to keep events and invitations together."}</p><label className="formField"><span>Email address</span><input name="email" type="email" required autoComplete="email" /></label><label className="formField"><span>Password</span><input name="password" type="password" required minLength={6} autoComplete={authMode === "signin" ? "current-password" : "new-password"} /></label>{authError && <p className="formError">{authError}</p>}<button className="primaryCta" type="submit" disabled={authLoading}>{authLoading ? "One moment…" : authMode === "signin" ? "Sign in" : "Create account"}<span>→</span></button><button className="authSwitch" type="button" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(""); }}>{authMode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</button></form></div>}
    </>
  );
}
