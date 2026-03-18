export interface Specialist {
  id?: string;
  name: string;
  link: string;
}

export const SPECIALISTS: Specialist[] = [
  { name: "Antuan Snead-Lead", link: "https://calendar.app.google/9T3TKQDGH8FemtsG7" },
  { name: "Samantha Leon-II", link: "https://calendar.app.google/HvCJESoVZq6MrPuq8" },
  { name: "Jason Moreno-Sr", link: "https://calendar.app.google/TeXLe8WT9E5h1cU66" },
  { name: "Elizabeth Finley", link: "https://calendar.app.google/v2t8nVhCju5jvssV9" },
  { name: "Fabian Pacheco", link: "https://calendar.app.google/Nsc6kB99qA399K1y9" },
  { name: "Paula Rendon", link: "https://calendar.app.google/URRNgDqoiutrZ6q2A" },
  { name: "Shayla Kilpatrick", link: "https://calendar.app.google/CRWvmx5fy5hQMB8p7" },
  { name: "Justin Kennedy", link: "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0NiuSf0YRadkjR_blok11prV8K2HZ8BsvyKx7qVfQKprOI5k1t67Nuk6mVNyO4QWlozug9alX2" },
  { name: "Enrica Verrett", link: "https://calendar.app.google/dJHHw4BvraaUCGWw5" },
  { name: "Macey Luna", link: "https://calendar.app.google/gW5TZ2NPr44QcoHw5" },
  { name: "Bridgette Colbert-Paulin", link: "https://calendar.app.google/AteEVDHGKJezwzB39" },
  { name: "Carlos Garcia", link: "https://calendar.app.google/5fCFtrCQYdyvDWqWA" },
  { name: "Derrick Daniel", link: "https://calendar.app.google/fKb2jCC72ZXpbDzu8" },
  { name: "Maricela Franco", link: "https://calendar.app.google/ezWeihwg2pJsRpQy6" },
  { name: "Terrell Tinson - Senior", link: "https://calendar.app.google/G4ekpQ6CWzw7CY5x6" },
  { name: "Staci Barfield", link: "https://calendar.app.google/ecnJ1WPBXkcdZWRA7" },
  { name: "Kaylee Streeter", link: "https://calendar.app.google/uCZzjVRVpBCef3gt5" },
  { name: "Asia Jackson", link: "https://calendar.app.google/4Bruzr4VFLoZBbMx5" },
  { name: "Arinn Williamson - Senior", link: "https://calendar.app.google/5gBBPMV2dctsSSSb7" },
  { name: "Jewel McKnight", link: "https://calendar.app.google/nSNJrADuGp3NPdy19" },
  { name: "Naina Hingher - Senior", link: "https://calendar.app.google/7TT8DCMbq4wL766B8" },
  { name: "Sherman Williams", link: "https://calendar.app.google/4AZVhPb7Hd4tcvyt6" },
  { name: "Shweta Save - Lead", link: "https://calendar.app.google/SfAZW4PJX9drBVPJ7" },
  { name: "Theresa Borden", link: "https://calendar.app.google/EcgcK7o8hgBxZ4Cy9" },
  { name: "Joseph Tailly", link: "https://calendar.app.google/cYZiZDAkJBrLG7kw9" },
];

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: Badge[] = [
  { id: 'first-step', name: 'First Step', description: 'Completed your first AI mock interview.', icon: '🚀' },
  { id: 'high-achiever', name: 'High Achiever', description: 'Scored over 85 in an interview.', icon: '🏆' },
  { id: 'consistent', name: 'Consistent', description: 'Completed 5 mock interviews.', icon: '🔥' },
  { id: 'clarity-master', name: 'Clarity Master', description: 'Scored over 90 in Clarity.', icon: '💎' },
  { id: 'confidence-pro', name: 'Confidence Pro', description: 'Scored over 90 in Confidence.', icon: '🛡️' },
  { id: 'alignment-expert', name: 'Alignment Expert', description: 'Scored over 90 in Alignment.', icon: '🎯' },
];
