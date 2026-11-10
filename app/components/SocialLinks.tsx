const socialProfiles = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/thefamilyweather/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.25" />
        <circle cx="17.4" cy="6.7" r="1" className="socialIconFill" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/profile.php?id=1396088403592189",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.2 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H8V13h2.8v8h3.4Z" className="socialIconFill" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/channel/UC8krcGNf0KCpuscJVghtVBQ",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 8.1a3 3 0 0 0-2.1-2.2C17 5.4 12 5.4 12 5.4s-5 0-6.9.5A3 3 0 0 0 3 8.1 31 31 0 0 0 2.6 12 31 31 0 0 0 3 15.9a3 3 0 0 0 2.1 2.2c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.2 31 31 0 0 0 .4-3.9 31 31 0 0 0-.4-3.9Z" />
        <path d="m10 15 5-3-5-3v6Z" className="socialIconFill" />
      </svg>
    ),
  },
] as const;

export default function SocialLinks() {
  return (
    <nav className="footerSocialLinks" aria-label="Family Weather on social media">
      {socialProfiles.map(({ name, href, icon }) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Family Weather on ${name}`}>
          {icon}
          <span>{name}</span>
        </a>
      ))}
    </nav>
  );
}
